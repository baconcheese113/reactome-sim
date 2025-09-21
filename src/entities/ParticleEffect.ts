export class ParticleEffect extends Phaser.GameObjects.Particles.ParticleEmitter {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config?: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig
  ) {
    super(scene, x, y, texture, config);
    
    scene.add.existing(this);
  }

  public static createMolecularFlow(
    scene: Phaser.Scene,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    moleculeColor: number = 0x00ff88
  ): ParticleEffect {
    // Create a simple white pixel as texture if it doesn't exist
    if (!scene.textures.exists('particle')) {
      scene.add.graphics()
        .fillStyle(0xffffff)
        .fillRect(0, 0, 4, 4)
        .generateTexture('particle', 4, 4)
        .destroy();
    }

    const angle = Math.atan2(toY - fromY, toX - fromX);
    const distance = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);

    const emitter = new ParticleEffect(scene, fromX, fromY, 'particle', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.2, end: 0.05 },
      alpha: { start: 1, end: 0 },
      lifespan: (distance / 75) * 1000, // Adjust based on distance
      tint: moleculeColor,
      quantity: 2,
      frequency: 100,
      angle: {
        min: (angle * 180) / Math.PI - 5,
        max: (angle * 180) / Math.PI + 5,
      },
    });

    // Stop emitting after a short time
    scene.time.delayedCall(1000, () => {
      emitter.stop();
    });

    // Clean up after particles finish
    scene.time.delayedCall(2000, () => {
      emitter.destroy();
    });

    return emitter;
  }

  public static createReactionBurst(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: number = 0xffff00
  ): ParticleEffect {
    if (!scene.textures.exists('particle')) {
      scene.add.graphics()
        .fillStyle(0xffffff)
        .fillRect(0, 0, 4, 4)
        .generateTexture('particle', 4, 4)
        .destroy();
    }

    const emitter = new ParticleEffect(scene, x, y, 'particle', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      tint: color,
      quantity: 12,
      frequency: -1, // Explode all at once
      angle: { min: 0, max: 360 },
    });

    // Trigger explosion
    emitter.explode(12);

    // Clean up
    scene.time.delayedCall(1000, () => {
      emitter.destroy();
    });

    return emitter;
  }

  public static createEnergyGlow(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number = 50,
    color: number = 0x00ff88
  ): ParticleEffect {
    if (!scene.textures.exists('particle')) {
      scene.add.graphics()
        .fillStyle(0xffffff)
        .fillRect(0, 0, 4, 4)
        .generateTexture('particle', 4, 4)
        .destroy();
    }

    const emitter = new ParticleEffect(scene, x, y, 'particle', {
      speed: { min: 10, max: Math.min(30, radius * 0.6) }, // Use radius to influence speed
      scale: { start: 0.1, end: 0.3 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 2000,
      tint: color,
      quantity: 1,
      frequency: 50,
      angle: { min: 0, max: 360 },
      radial: true,
      blendMode: 'ADD'
    });

    return emitter;
  }
}