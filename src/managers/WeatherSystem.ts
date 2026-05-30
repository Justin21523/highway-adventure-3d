// src/managers/WeatherSystem.ts
import * as THREE from 'three';

export type WeatherState = 'clear' | 'overcast' | 'rain' | 'storm';
export type TimeOfDay = { hour: number; lightDir: THREE.Vector3; skyColor: THREE.Color; fogColor: THREE.Color; fogDensity: number };

export class WeatherSystem {
  private static instance: WeatherSystem | null = null;
  private cycleTime = 0; // 0-1 (0=noon, 0.5=midnight)
  private weather = 'clear' as WeatherState;
  private rainBuffer: Float32Array;
  private rainPositions: Float32Array;
  private rainVelocities: Float32Array;
  private rainCount = 800;
  private intensity = 0; // 0 to 1
  private windStrength = 0;

  private constructor() {
    this.rainBuffer = new Float32Array(this.rainCount * 3);
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount);
    for (let i = 0; i < this.rainCount; i++) {
      this.resetRainDrop(i);
    }
  }

  static getInstance(): WeatherSystem {
    if (!WeatherSystem.instance) WeatherSystem.instance = new WeatherSystem();
    return WeatherSystem.instance;
  }

  resetRainDrop(i: number) {
    const idx = i * 3;
    this.rainPositions[idx] = (Math.random() - 0.5) * 120;
    this.rainPositions[idx + 1] = Math.random() * 60;
    this.rainPositions[idx + 2] = (Math.random() - 0.5) * 120;
    this.rainVelocities[i] = 25 + Math.random() * 15;
  }

  setWeather(state: WeatherState) {
    this.weather = state;
    switch (state) {
      case 'clear': this.intensity = 0; this.windStrength = 0.2; break;
      case 'overcast': this.intensity = 0; this.windStrength = 0.5; break;
      case 'rain': this.intensity = 0.4; this.windStrength = 1.2; break;
      case 'storm': this.intensity = 1.0; this.windStrength = 2.5; break;
    }
  }

  getWeatherState() {
    return this.weather;
  }

  private getColorBrightness(color: THREE.Color) {
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  }

  getTimeOfDay(): TimeOfDay {
    const t = this.cycleTime;
    const sunAngle = (t * Math.PI * 2) - Math.PI / 2;
    const dayFactor = Math.max(0, Math.cos(sunAngle));
    const lightDir = new THREE.Vector3(Math.cos(sunAngle), Math.sin(sunAngle), 0.3).normalize();
    const skyColor = new THREE.Color().lerpColors(new THREE.Color('#020617'), new THREE.Color('#bae6fd'), dayFactor);
    const fogColor = new THREE.Color().lerpColors(new THREE.Color('#030712'), new THREE.Color('#e2e8f0'), dayFactor);
    return { hour: Math.floor(t * 24), lightDir, skyColor, fogColor, fogDensity: 0.015 + (1 - dayFactor) * 0.01 };
  }

  update(delta: number, scene: THREE.Scene) {
    // Advance day cycle (1 real minute = 1 full day)
    this.cycleTime = (this.cycleTime + delta * 0.001) % 1;
    const { lightDir, skyColor, fogColor, fogDensity } = this.getTimeOfDay();

    // Interpolate scene lighting/fog
    const ambient = scene.children.find(c => (c as THREE.AmbientLight).isAmbientLight) as THREE.AmbientLight;
    const dirLight = scene.children.find(c => (c as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight;
    
    if (ambient) {
      ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, 0.2 + this.intensity * 0.3 + Math.max(0.1, this.getColorBrightness(skyColor)), 0.05);
      ambient.color.copy(skyColor).multiplyScalar(0.8);
    }
    if (dirLight) {
      dirLight.position.copy(lightDir).multiplyScalar(80);
      dirLight.intensity = THREE.MathUtils.lerp(dirLight.intensity, 1.5 * Math.max(0.1, this.getColorBrightness(skyColor)), 0.05);
    }

    const fog = scene.fog as THREE.FogExp2;
    if (fog) {
      fog.color.lerp(fogColor, 0.02);
      fog.density = THREE.MathUtils.lerp(fog.density, fogDensity + this.intensity * 0.02, 0.02);
    }

    if (scene.background instanceof THREE.Color) scene.background.copy(skyColor);
    else scene.background = skyColor.clone();

    // Rain physics & buffer update
    if (this.intensity > 0.05) {
      const playerPos = { x: 0, z: 0 }; // Will be patched via useFrame
      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        this.rainPositions[idx + 1] -= this.rainVelocities[i] * delta * (0.5 + this.intensity * 0.5);
        this.rainPositions[idx] += this.windStrength * delta * 2;
        
        if (this.rainPositions[idx + 1] < 0) this.resetRainDrop(i);
      }
    }
  }

  getRainData() { return { positions: this.rainPositions, intensity: this.intensity, count: this.rainCount }; }
}
