export enum MoleculeType {
  // Starting materials and products
  GLUCOSE = 'glucose',
  PYRUVATE = 'pyruvate',
  
  // Energy molecules
  ATP = 'atp',
  ADP = 'adp',
  
  // Electron carriers
  NADH = 'nadh',
  NAD = 'nad',
  
  // Phosphate groups
  PHOSPHATE = 'phosphate',
  
  // Glycolysis intermediates
  GLUCOSE_6_PHOSPHATE = 'glucose_6_phosphate',
  FRUCTOSE_6_PHOSPHATE = 'fructose_6_phosphate',
  FRUCTOSE_1_6_BISPHOSPHATE = 'fructose_1_6_bisphosphate',
  DIHYDROXYACETONE_PHOSPHATE = 'dihydroxyacetone_phosphate',
  GLYCERALDEHYDE_3_PHOSPHATE = 'glyceraldehyde_3_phosphate',
  ONE_3_BISPHOSPHOGLYCERATE = '1_3_bisphosphoglycerate',
  THREE_PHOSPHOGLYCERATE = '3_phosphoglycerate',
  TWO_PHOSPHOGLYCERATE = '2_phosphoglycerate',
  PHOSPHOENOLPYRUVATE = 'phosphoenolpyruvate',
  
  // Other important molecules
  WATER = 'water',
  LACTATE = 'lactate',
}

export interface MoleculeProperties {
  id: string;
  type: MoleculeType;
  name: string;
  formula: string;
  molecularWeight: number;
  color: number;
  size: number;
  energyContent?: number; // For molecules like ATP, glucose
}

export class Molecule extends Phaser.GameObjects.Container {
  public properties: MoleculeProperties;
  public isMoving: boolean = false;
  public velocity: Phaser.Math.Vector2;
  private moleculeSprite: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    properties: MoleculeProperties
  ) {
    super(scene, x, y);

    this.properties = properties;
    this.velocity = new Phaser.Math.Vector2(0, 0);

    this.createVisuals();
    this.setupInteractions();

    scene.add.existing(this);
  }

  private createVisuals(): void {
    // Create molecule visual representation
    this.moleculeSprite = this.scene.add.graphics();
    this.moleculeSprite.fillStyle(this.properties.color);
    this.moleculeSprite.fillCircle(0, 0, this.properties.size);
    
    // Add glow effect
    this.moleculeSprite.lineStyle(2, this.properties.color, 0.3);
    this.moleculeSprite.strokeCircle(0, 0, this.properties.size + 5);

    // Add label
    this.labelText = this.scene.add.text(0, this.properties.size + 15, this.properties.name, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
    });
    this.labelText.setOrigin(0.5);

    this.add([this.moleculeSprite, this.labelText]);
  }

  private setupInteractions(): void {
    this.setSize(this.properties.size * 2, this.properties.size * 2);
    this.setInteractive();

    // Hover effects
    this.on('pointerover', () => {
      this.setScale(1.1);
      this.scene.tweens.add({
        targets: this.moleculeSprite,
        alpha: 0.8,
        duration: 200,
      });
    });

    this.on('pointerout', () => {
      this.setScale(1);
      this.scene.tweens.add({
        targets: this.moleculeSprite,
        alpha: 1,
        duration: 200,
      });
    });
  }

  public startMoving(targetX: number, targetY: number, speed: number = 100): void {
    this.isMoving = true;
    
    const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
    const duration = (distance / speed) * 1000;

    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        this.isMoving = false;
        this.emit('movementComplete');
      },
    });
  }

  public highlight(color: number = 0x00ff00): void {
    this.scene.tweens.add({
      targets: this.moleculeSprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      repeat: 2,
    });
  }

  public destroy(): void {
    this.moleculeSprite.destroy();
    this.labelText.destroy();
    super.destroy();
  }
}