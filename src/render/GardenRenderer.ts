import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BOARD_SIZE, type Cell, type GameEvent, type GameState } from '../game/types';

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  rotation: number;
  color: THREE.Color;
};

const MAX_SEGMENTS = BOARD_SIZE * BOARD_SIZE + 2;
const BODY_HEIGHT = 0.51;
const BODY_RADIUS = 0.355;
const CENTER = (BOARD_SIZE - 1) / 2;
const PALETTE = {
  rim: '#d4d9bd',
  base: '#b2be97',
  moss: '#91a777',
  mossLight: '#9db383',
  green: '#87bf48',
  head: '#a6d360',
  cream: '#fff8da',
  ink: '#273b25',
  apple: '#ef7565',
};

/** A presentation-only scene. Gameplay and its clock remain outside this class. */
export class GardenRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 100);
  private readonly snake = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly food = new THREE.Group();
  private readonly body: THREE.InstancedMesh;
  private readonly connections: THREE.InstancedMesh;
  private readonly markings: THREE.InstancedMesh;
  private readonly shadows: THREE.InstancedMesh;
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly particles: Particle[] = [];
  private readonly geometries = new Set<THREE.BufferGeometry>();
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();
  private readonly transform = new THREE.Object3D();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly direction = new THREE.Vector3();
  private readonly tint = new THREE.Color();
  private readonly tailTint = new THREE.Color('#719f3e');
  private readonly path: THREE.Vector3[] = [];
  private reducedMotion = false;
  private lastTime = 0;
  private collisionAt = -100;
  private foodPopAt = -100;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.camera.position.set(0, 28, 19);
    this.camera.lookAt(0, 0, 0);

    this.scene.add(new THREE.HemisphereLight('#fff8df', '#84996e', 2.3));
    const sunlight = new THREE.DirectionalLight('#fff0d5', 3.4);
    sunlight.position.set(-12, 23, 10);
    this.scene.add(sunlight);
    const fill = new THREE.DirectionalLight('#e4efce', 0.8);
    fill.position.set(9, 10, -10);
    this.scene.add(fill);

    this.createBoard();
    this.createPlants();
    this.scene.add(this.snake, this.food);

    const sphere = this.keepGeometry(new THREE.SphereGeometry(1, 16, 10));
    const cylinder = this.keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true));
    const bodyMaterial = this.material('#ffffff', 0.48);
    this.body = this.instances(sphere, bodyMaterial, MAX_SEGMENTS);
    this.connections = this.instances(cylinder, bodyMaterial, MAX_SEGMENTS);
    this.markings = this.instances(sphere, this.material('#bde080', 0.7), MAX_SEGMENTS);
    this.snake.add(this.body, this.connections, this.markings, this.head);

    const shadowTexture = this.createShadowTexture();
    const shadowMaterial = this.keepMaterial(new THREE.MeshBasicMaterial({
      color: '#304c25', map: shadowTexture, transparent: true, opacity: 0.25,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    }));
    const shadowPlane = this.keepGeometry(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    this.shadows = this.instances(shadowPlane, shadowMaterial, MAX_SEGMENTS);
    this.scene.add(this.shadows);
    this.createHead(sphere);
    this.createFood(sphere);

    this.particleMesh = this.instances(sphere, this.material('#d5e18b', 0.9), 40);
    this.particleMesh.count = 0;
    this.scene.add(this.particleMesh);
    this.resize(canvas.clientWidth || 640, canvas.clientHeight || 640);
  }

  resize(width: number, height: number): void {
    if (this.disposed || width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    // The rim, its front thickness and the corner plants stay inside the view.
    const viewHeight = Math.max(20.8, 23.7 / aspect);
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
    if (value) this.particles.length = 0;
  }

  emit(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'collision') this.collisionAt = this.lastTime;
      if (event.type === 'eat') {
        this.foodPopAt = this.lastTime;
        if (!this.reducedMotion) this.burst(event.cell, 10);
      }
      if (event.type === 'victory' && !this.reducedMotion) {
        this.burst({ x: 5, y: 8 }, 18);
        this.burst({ x: 14, y: 8 }, 18);
      }
    }
  }

  render(state: GameState, previous: GameState, alpha: number, timeSeconds: number): void {
    if (this.disposed) return;
    const dt = Math.max(0, Math.min(timeSeconds - this.lastTime, 0.05));
    this.lastTime = timeSeconds;
    const progress = Math.max(0, Math.min(alpha, 1));
    this.updateSnake(state, previous, progress, timeSeconds);
    this.updateFood(state, timeSeconds);
    this.updateParticles(dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.renderer.dispose();
  }

  private keepGeometry<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.add(geometry);
    return geometry;
  }

  private keepMaterial<T extends THREE.Material>(material: T): T {
    this.materials.add(material);
    return material;
  }

  private material(color: THREE.ColorRepresentation, roughness = 0.8): THREE.MeshStandardMaterial {
    return this.keepMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = this.scene): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    parent.add(mesh);
    return mesh;
  }

  private instances(geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    return mesh;
  }

  private createBoard(): void {
    const base = this.mesh(this.keepGeometry(new RoundedBoxGeometry(21.9, 0.9, 21.9, 3, 0.35)), this.material(PALETTE.base));
    base.position.y = -0.68;
    const rim = this.mesh(this.keepGeometry(new RoundedBoxGeometry(22, 0.48, 22, 3, 0.32)), this.material(PALETTE.rim));
    rim.position.y = -0.1;
    const inset = this.mesh(this.keepGeometry(new RoundedBoxGeometry(20.24, 0.12, 20.24, 2, 0.08)), this.material('#6e885a'));
    inset.position.y = 0.11;

    const tileGeometry = this.keepGeometry(new THREE.BoxGeometry(0.997, 0.055, 0.997));
    const tiles = this.instances(tileGeometry, this.material('#ffffff'), BOARD_SIZE * BOARD_SIZE);
    tiles.count = BOARD_SIZE * BOARD_SIZE;
    const dark = new THREE.Color(PALETTE.moss);
    const light = new THREE.Color(PALETTE.mossLight);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const index = y * BOARD_SIZE + x;
        this.transform.position.set(x - CENTER, 0.19, y - CENTER);
        this.transform.rotation.set(0, 0, 0);
        this.transform.scale.set(1, 1, 1);
        this.transform.updateMatrix();
        tiles.setMatrixAt(index, this.transform.matrix);
        tiles.setColorAt(index, (x + y) % 2 ? dark : light);
      }
    }
    this.scene.add(tiles);

    // A soft procedural contact shadow grounds the raised board without a costly shadow pass.
    const groundShadow = this.mesh(
      this.keepGeometry(new THREE.PlaneGeometry(26.3, 26.3).rotateX(-Math.PI / 2)),
      this.keepMaterial(new THREE.MeshBasicMaterial({
        color: '#465436', map: this.createShadowTexture(true), transparent: true, opacity: 0.22, depthWrite: false,
      })),
    );
    groundShadow.position.set(0.35, -1.2, 0.65);

    const pegGeometry = this.keepGeometry(new THREE.SphereGeometry(0.07, 8, 6));
    const pegMaterial = this.material('#f4edcd');
    for (const x of [-6, -2, 2, 6]) {
      const peg = this.mesh(pegGeometry, pegMaterial);
      peg.position.set(x, 0.156, 10.6);
      peg.scale.y = 0.3;
    }
  }

  private createPlants(): void {
    const leafGeometry = this.keepGeometry(new THREE.SphereGeometry(1, 10, 7));
    const leafMaterials = [this.material('#607e4c'), this.material('#7e9c5d'), this.material('#a2b976')];
    const petalMaterial = this.material('#f7e8af');
    const centerMaterial = this.material('#dcad53');
    const stoneMaterial = this.material('#c2c8a9');
    // Tiny plants inhabit only the rim, never an active grid cell.
    for (const [index, x, z] of [[0, -10.5, -10.4], [1, 10.4, 10.5], [2, 10.5, -10.4]] as const) {
      const plant = new THREE.Group();
      plant.position.set(x, 0.18, z);
      for (let leaf = 0; leaf < 5; leaf++) {
        const angle = leaf * Math.PI * 2 / 5 + index;
        const blade = this.mesh(leafGeometry, leafMaterials[leaf % leafMaterials.length]!, plant);
        blade.position.set(Math.cos(angle) * 0.25, 0.12 + leaf % 2 * 0.08, Math.sin(angle) * 0.25);
        blade.scale.set(0.15, 0.13, 0.44);
        blade.rotation.set(Math.cos(angle) * 0.3, Math.PI / 2 - angle, Math.sin(angle) * 0.3);
      }
      if (index !== 2) {
        const flower = new THREE.Group();
        flower.position.set(-0.11, 0.36, -0.12);
        for (let petal = 0; petal < 5; petal++) {
          const angle = petal * Math.PI * 2 / 5;
          const mesh = this.mesh(leafGeometry, petalMaterial, flower);
          mesh.position.set(Math.cos(angle) * 0.13, 0, Math.sin(angle) * 0.13);
          mesh.scale.set(0.13, 0.065, 0.13);
        }
        const middle = this.mesh(leafGeometry, centerMaterial, flower);
        middle.scale.set(0.09, 0.065, 0.09);
        middle.position.y = 0.025;
        plant.add(flower);
      }
      this.scene.add(plant);
    }
    for (let i = 0; i < 3; i++) {
      const pebble = this.mesh(leafGeometry, stoneMaterial);
      pebble.position.set(-10.55 + i * 0.2, 0.2, 10.48 - i % 2 * 0.17);
      pebble.scale.set(0.2 - i * 0.02, 0.11, 0.14);
      pebble.rotation.y = i;
    }
  }

  private createHead(sphere: THREE.SphereGeometry): void {
    const face = this.mesh(sphere, this.material(PALETTE.head, 0.4), this.head);
    face.scale.set(0.45, 0.39, 0.49);
    const eyeWhite = this.material(PALETTE.cream, 0.36);
    const pupilMaterial = this.material(PALETTE.ink, 0.32);
    const shineMaterial = this.keepMaterial(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    for (const side of [-1, 1]) {
      const eye = this.mesh(sphere, eyeWhite, this.head);
      eye.position.set(side * 0.26, 0.27, 0.24);
      eye.scale.set(0.185, 0.19, 0.175);
      const pupil = this.mesh(sphere, pupilMaterial, this.head);
      pupil.position.set(side * 0.26, 0.285, 0.389);
      pupil.scale.set(0.085, 0.1, 0.062);
      const shine = this.mesh(sphere, shineMaterial, this.head);
      shine.position.set(side * 0.26 - 0.021, 0.325, 0.441);
      shine.scale.setScalar(0.027);
      const nostril = this.mesh(sphere, this.material('#6b9b3c'), this.head);
      nostril.position.set(side * 0.1, 0.015, 0.476);
      nostril.scale.set(0.027, 0.02, 0.018);
    }
    const smileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.13, -0.115, 0.443),
      new THREE.Vector3(0, -0.21, 0.49),
      new THREE.Vector3(0.13, -0.115, 0.443),
    );
    this.mesh(this.keepGeometry(new THREE.TubeGeometry(smileCurve, 8, 0.014, 5, false)), this.material('#527832'), this.head);
  }

  private createFood(sphere: THREE.SphereGeometry): void {
    const appleMaterial = this.material(PALETTE.apple, 0.36);
    const fruit = this.mesh(sphere, appleMaterial, this.food);
    fruit.scale.set(0.4, 0.4, 0.38);
    fruit.position.y = 0.37;
    const lobe = this.mesh(sphere, appleMaterial, this.food);
    lobe.scale.set(0.26, 0.29, 0.31);
    lobe.position.set(-0.15, 0.43, 0);
    const stem = this.mesh(this.keepGeometry(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 7)), this.material('#775138'), this.food);
    stem.position.set(0, 0.8, 0);
    stem.rotation.z = -0.2;
    const leaf = this.mesh(sphere, this.material('#5c853a', 0.5), this.food);
    leaf.position.set(0.18, 0.86, 0);
    leaf.scale.set(0.26, 0.035, 0.115);
    leaf.rotation.z = 0.35;
    const glint = this.mesh(sphere, this.material('#ffc5a1', 0.35), this.food);
    glint.position.set(-0.22, 0.56, 0.26);
    glint.scale.set(0.055, 0.1, 0.025);
    glint.rotation.z = -0.4;

    const shadow = this.mesh(
      this.keepGeometry(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)),
      this.keepMaterial(new THREE.MeshBasicMaterial({ color: '#314327', map: this.createShadowTexture(), transparent: true, opacity: 0.3, depthWrite: false })),
      this.food,
    );
    shadow.position.y = 0.016;
  }

  private createShadowTexture(square = false): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = Math.abs((x + 0.5) / size * 2 - 1);
        const v = Math.abs((y + 0.5) / size * 2 - 1);
        const distance = square ? Math.pow(Math.pow(u, 7) + Math.pow(v, 7), 1 / 7) : Math.hypot(u, v);
        const alpha = square ? Math.max(0, Math.min(1, (1 - distance) * 5)) : Math.pow(Math.max(0, 1 - distance), 1.7);
        const index = (y * size + x) * 4;
        data[index] = data[index + 1] = data[index + 2] = 255;
        data[index + 3] = Math.round(alpha * 255);
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    this.textures.add(texture);
    return texture;
  }

  private cellPosition(cell: Cell, target: THREE.Vector3): THREE.Vector3 {
    return target.set(cell.x - CENTER, BODY_HEIGHT, cell.y - CENTER);
  }

  private updateSnake(state: GameState, previous: GameState, alpha: number, time: number): void {
    const cells = state.snake;
    const old = previous.snake;
    if (!cells.length) { this.snake.visible = false; this.shadows.count = 0; return; }
    this.snake.visible = true;
    const first = cells[0]!;
    const oldFirst = old[0];
    const canInterpolate = state.status === 'running' && oldFirst !== undefined &&
      Math.abs(first.x - oldFirst.x) + Math.abs(first.y - oldFirst.y) === 1 &&
      cells.length >= old.length && cells.length <= old.length + 1;
    // Keep every original corner in the polyline. Interpolating whole segments
    // directly would connect diagonal points and slice through those corners.
    let pathLength = 0;
    const point = (cell: Cell) => {
      const target = this.path[pathLength] ?? (this.path[pathLength] = new THREE.Vector3());
      this.cellPosition(cell, target);
      pathLength++;
      return target;
    };
    if (canInterpolate) {
      const leading = point(oldFirst);
      leading.x += (first.x - oldFirst.x) * alpha;
      leading.z += (first.y - oldFirst.y) * alpha;
      for (let index = 0; index < old.length - 1; index++) point(old[index]!);
      const last = point(old[old.length - 1]!);
      if (cells.length === old.length && old.length > 1) {
        const beforeLast = old[old.length - 2]!;
        const tail = old[old.length - 1]!;
        last.x += (beforeLast.x - tail.x) * alpha;
        last.z += (beforeLast.y - tail.y) * alpha;
      }
    } else {
      for (const cell of cells) point(cell);
    }

    let connectionCount = 0;
    let markingCount = 0;
    const collisionAge = time - this.collisionAt;
    const recoil = !this.reducedMotion && state.status === 'game-over' && collisionAge < 0.4
      ? Math.sin(collisionAge * 35) * Math.exp(-collisionAge * 12) * 0.075 : 0;
    this.snake.position.y = recoil;
    for (let index = 0; index < pathLength; index++) {
      const p = this.path[index]!;
      const tailDistance = pathLength - 1 - index;
      const radius = BODY_RADIUS * (tailDistance === 0 ? 0.6 : tailDistance === 1 ? 0.88 : 1);
      this.transform.position.copy(p);
      this.transform.rotation.set(0, 0, 0);
      this.transform.scale.set(radius, radius * 0.9, radius);
      this.transform.updateMatrix();
      this.body.setMatrixAt(index, this.transform.matrix);
      this.tint.set(PALETTE.green).lerp(this.tailTint, index / Math.max(1, pathLength - 1) * 0.25);
      this.body.setColorAt(index, this.tint);

      this.transform.position.set(p.x, 0.23, p.z);
      this.transform.scale.set(1.25, 1, 1.25);
      this.transform.updateMatrix();
      this.shadows.setMatrixAt(index, this.transform.matrix);

      if (index > 0) {
        const before = this.path[index - 1]!;
        this.direction.subVectors(p, before);
        const length = this.direction.length();
        if (length > 0.001) {
          this.transform.position.copy(p).add(before).multiplyScalar(0.5);
          this.transform.quaternion.setFromUnitVectors(this.up, this.direction.normalize());
          this.transform.scale.set(radius, length, radius);
          this.transform.updateMatrix();
          this.connections.setMatrixAt(connectionCount, this.transform.matrix);
          this.connections.setColorAt(connectionCount, this.tint);
          connectionCount++;
        }
      }
      if (index > 1 && index < pathLength - 1 && index % 2 === 0) {
        this.transform.position.set(p.x, BODY_HEIGHT + radius * 0.9, p.z);
        this.transform.rotation.set(0, 0, 0);
        this.transform.scale.set(radius * 0.3, 0.013, radius * 0.44);
        this.transform.updateMatrix();
        this.markings.setMatrixAt(markingCount++, this.transform.matrix);
      }
    }
    this.body.count = pathLength;
    this.connections.count = connectionCount;
    this.markings.count = markingCount;
    this.shadows.count = pathLength;
    for (const mesh of [this.body, this.connections, this.markings, this.shadows]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.head.position.copy(this.path[0]!);
    const angle = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[state.direction];
    this.head.rotation.y = angle;
    const pulse = !this.reducedMotion && time - this.foodPopAt < 0.25 ? Math.sin((time - this.foodPopAt) / 0.25 * Math.PI) * 0.08 : 0;
    this.head.scale.setScalar(1 + pulse);
  }

  private updateFood(state: GameState, time: number): void {
    this.food.visible = state.food !== null;
    if (!state.food) return;
    const bob = !this.reducedMotion && (state.status === 'running' || state.status === 'ready') ? Math.sin(time * 2.6) * 0.045 : 0;
    this.food.position.set(state.food.x - CENTER, 0.24 + bob, state.food.y - CENTER);
    this.food.rotation.y = -0.4;
  }

  private burst(cell: Cell, count: number): void {
    for (let index = 0; index < count && this.particles.length < 40; index++) {
      const angle = index / count * Math.PI * 2;
      const variation = (index * 0.61803398875) % 1;
      this.particles.push({
        position: new THREE.Vector3(cell.x - CENTER, 0.9, cell.y - CENTER),
        velocity: new THREE.Vector3(Math.cos(angle) * (1 + variation), 2 + variation * 2, Math.sin(angle) * (1 + variation)),
        life: 0.6 + variation * 0.2,
        rotation: angle,
        color: new THREE.Color(index % 3 === 0 ? '#f2bd66' : index % 3 === 1 ? '#d6df9a' : '#6d9951'),
      });
    }
  }

  private updateParticles(dt: number): void {
    let count = 0;
    for (let index = this.particles.length - 1; index >= 0; index--) {
      const particle = this.particles[index]!;
      particle.life -= dt;
      if (particle.life <= 0 || this.reducedMotion) { this.particles.splice(index, 1); continue; }
      particle.velocity.y -= dt * 7;
      particle.position.addScaledVector(particle.velocity, dt);
      this.transform.position.copy(particle.position);
      this.transform.rotation.set(particle.rotation + particle.life * 4, particle.rotation, particle.life * 5);
      const size = Math.min(1, particle.life / 0.2) * 0.1;
      this.transform.scale.set(size, size * 0.35, size * 1.6);
      this.transform.updateMatrix();
      this.particleMesh.setMatrixAt(count, this.transform.matrix);
      this.particleMesh.setColorAt(count, particle.color);
      count++;
    }
    this.particleMesh.count = count;
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }
}
