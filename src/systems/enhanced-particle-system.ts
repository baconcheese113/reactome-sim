import Phaser from 'phaser';

export interface ParticleEffectConfig {
  x: number;
  y: number;
  color: number;
  particleCount: number;
  duration: number;
  scale: { min: number; max: number };
  speed: { min: number; max: number };
  alpha: { start: number; end: number };
  blendMode?: Phaser.BlendModes;
}

export interface ReactionEffectConfig {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  particleColor: number;
  energyChange: number;
  reactionType: 'synthesis' | 'breakdown' | 'transfer';
}

export class enhanced_particle_system {
  private scene: Phaser.Scene;
  private activeEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTextures();
  }

  private createParticleTextures(): void {
    // Create energy particle texture
    if (!this.scene.textures.exists('energy-particle')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0x00ff88);
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('energy-particle', 8, 8);
      graphics.destroy();
    }

    // Create molecule bond texture
    if (!this.scene.textures.exists('bond-particle')) {
      const graphics = this.scene.add.graphics();
      graphics.lineStyle(2, 0x66aaff);
      graphics.beginPath();
      graphics.moveTo(0, 3);
      graphics.lineTo(6, 3);
      graphics.strokePath();
      graphics.generateTexture('bond-particle', 6, 6);
      graphics.destroy();
    }

    // Create enzyme activity texture
    if (!this.scene.textures.exists('enzyme-particle')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xff6600);
      graphics.fillRect(0, 0, 3, 6);
      graphics.generateTexture('enzyme-particle', 3, 6);
      graphics.destroy();
    }
  }

  public createEnergyRelease(config: ParticleEffectConfig): string {
    const emitterId = `energy_${Date.now()}_${Math.random()}`;
    
    const emitter = this.scene.add.particles(config.x, config.y, 'energy-particle', {
      scale: { start: config.scale.max, end: config.scale.min },
      alpha: { start: config.alpha.start, end: config.alpha.end },
      speed: { min: config.speed.min, max: config.speed.max },
      lifespan: config.duration,
      quantity: 2,
      frequency: 50,
      blendMode: config.blendMode || Phaser.BlendModes.ADD,
      tint: config.color,
      gravityY: -100,
    });

    this.activeEmitters.set(emitterId, emitter);

    // Auto-cleanup after duration
    this.scene.time.delayedCall(config.duration + 1000, () => {
      this.stopEffect(emitterId);
    });

    return emitterId;
  }

  public createMolecularBond(startPos: { x: number; y: number }, endPos: { x: number; y: number }): string {
    const emitterId = `bond_${Date.now()}_${Math.random()}`;
    
    const distance = Phaser.Math.Distance.Between(startPos.x, startPos.y, endPos.x, endPos.y);
    const angle = Phaser.Math.Angle.Between(startPos.x, startPos.y, endPos.x, endPos.y);
    
    const emitter = this.scene.add.particles(startPos.x, startPos.y, 'bond-particle', {
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 1, end: 0.3 },
      speed: distance / 500,
      lifespan: 1500,
      quantity: 1,
      frequency: 100,
      angle: { min: Phaser.Math.RadToDeg(angle) - 5, max: Phaser.Math.RadToDeg(angle) + 5 },
      tint: 0x66aaff,
      blendMode: Phaser.BlendModes.SCREEN,
    });

    this.activeEmitters.set(emitterId, emitter);

    // Create connecting line effect
    const line = this.scene.add.line(0, 0, startPos.x, startPos.y, endPos.x, endPos.y, 0x66aaff, 0.6);
    line.setLineWidth(2);
    
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 1500,
      onComplete: () => line.destroy(),
    });

    this.scene.time.delayedCall(2000, () => {
      this.stopEffect(emitterId);
    });

    return emitterId;
  }

  public createEnzymeActivity(enzymePos: { x: number; y: number }): string {
    const emitterId = `enzyme_${Date.now()}_${Math.random()}`;
    
    const emitter = this.scene.add.particles(enzymePos.x, enzymePos.y, 'enzyme-particle', {
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.9, end: 0.1 },
      speed: { min: 20, max: 60 },
      lifespan: 800,
      quantity: 3,
      frequency: 150,
      angle: { min: 0, max: 360 },
      tint: 0xff6600,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.activeEmitters.set(emitterId, emitter);

    this.scene.time.delayedCall(2000, () => {
      this.stopEffect(emitterId);
    });

    return emitterId;
  }

  public createReactionEffect(config: ReactionEffectConfig): string {
    const emitterId = `reaction_${Date.now()}_${Math.random()}`;
    
    // Determine effect properties based on reaction type
    let particleTexture: string;
    let tintColor: number;
    let particleCount: number;
    let effectDuration: number;

    switch (config.reactionType) {
      case 'synthesis':
        particleTexture = 'bond-particle';
        tintColor = 0x00ff88;
        particleCount = 5;
        effectDuration = 2000;
        break;
      case 'breakdown':
        particleTexture = 'energy-particle';
        tintColor = 0xff4400;
        particleCount = 8;
        effectDuration = 1500;
        break;
      case 'transfer':
        particleTexture = 'enzyme-particle';
        tintColor = config.particleColor;
        particleCount = 3;
        effectDuration = 1000;
        break;
    }

    // Create particle stream from start to end position
    const distance = Phaser.Math.Distance.Between(
      config.startPos.x, config.startPos.y,
      config.endPos.x, config.endPos.y
    );
    const angle = Phaser.Math.Angle.Between(
      config.startPos.x, config.startPos.y,
      config.endPos.x, config.endPos.y
    );

    const emitter = this.scene.add.particles(config.startPos.x, config.startPos.y, particleTexture, {
      scale: { start: 1, end: 0.3 },
      alpha: { start: 1, end: 0 },
      speed: { min: distance / (effectDuration / 1000), max: distance / (effectDuration / 1000) * 1.2 },
      lifespan: effectDuration,
      quantity: particleCount,
      frequency: effectDuration / particleCount,
      angle: { min: Phaser.Math.RadToDeg(angle) - 10, max: Phaser.Math.RadToDeg(angle) + 10 },
      tint: tintColor,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.activeEmitters.set(emitterId, emitter);

    // Add energy visualization for exothermic/endothermic reactions
    if (Math.abs(config.energyChange) > 10) {
      const energyColor = config.energyChange < 0 ? 0xff0000 : 0x0088ff;
      this.createEnergyBurst(config.endPos, energyColor, Math.abs(config.energyChange));
    }

    this.scene.time.delayedCall(effectDuration + 500, () => {
      this.stopEffect(emitterId);
    });

    return emitterId;
  }

  private createEnergyBurst(pos: { x: number; y: number }, color: number, intensity: number): void {
    const burstEmitter = this.scene.add.particles(pos.x, pos.y, 'energy-particle', {
      scale: { start: 0.5, end: 1.5 },
      alpha: { start: 0.8, end: 0 },
      speed: { min: 30, max: 80 },
      lifespan: 1000,
      quantity: Math.min(Math.floor(intensity / 5), 10),
      frequency: 50,
      angle: { min: 0, max: 360 },
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.scene.time.delayedCall(1200, () => {
      burstEmitter.stop();
      this.scene.time.delayedCall(2000, () => {
        burstEmitter.destroy();
      });
    });
  }

  public createPathwayFlow(positions: { x: number; y: number }[]): string {
    const emitterId = `pathway_${Date.now()}_${Math.random()}`;
    
    if (positions.length < 2) return emitterId;

    // Create flowing particles along the pathway
    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i];
      const end = positions[i + 1];
      
      const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
      const angle = Phaser.Math.Angle.Between(start.x, start.y, end.x, end.y);

      const segmentEmitter = this.scene.add.particles(start.x, start.y, 'energy-particle', {
        scale: { start: 0.6, end: 0.3 },
        alpha: { start: 0.8, end: 0.2 },
        speed: distance / 2,
        lifespan: 2000,
        quantity: 2,
        frequency: 300,
        angle: { min: Phaser.Math.RadToDeg(angle) - 5, max: Phaser.Math.RadToDeg(angle) + 5 },
        tint: Phaser.Display.Color.HSVToRGB(i / positions.length, 0.8, 1).color,
        blendMode: Phaser.BlendModes.ADD,
      });

      // Delay each segment slightly
      this.scene.time.delayedCall(i * 200, () => {
        segmentEmitter.start();
      });

      this.scene.time.delayedCall(3000 + i * 200, () => {
        segmentEmitter.stop();
        this.scene.time.delayedCall(2000, () => {
          segmentEmitter.destroy();
        });
      });
    }

    return emitterId;
  }

  public stopEffect(emitterId: string): void {
    const emitter = this.activeEmitters.get(emitterId);
    if (emitter) {
      emitter.stop();
      this.activeEmitters.delete(emitterId);
      
      // Clean up emitter after particles finish
      this.scene.time.delayedCall(2000, () => {
        emitter.destroy();
      });
    }
  }

  public stopAllEffects(): void {
    for (const [emitterId] of this.activeEmitters) {
      this.stopEffect(emitterId);
    }
  }

  public destroy(): void {
    this.stopAllEffects();
  }
}