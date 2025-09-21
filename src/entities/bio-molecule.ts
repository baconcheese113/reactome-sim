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
  energyContent?: number;
}

export class BioMolecule extends Phaser.GameObjects.Container {
  public properties: MoleculeProperties;
  public isMoving: boolean = false;
  public velocity: Phaser.Math.Vector2;
  private moleculeSprite!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: MoleculeType
  ) {
    super(scene, x, y);

    this.properties = this.getMoleculeProperties(type);
    this.velocity = new Phaser.Math.Vector2(0, 0);

    this.createVisuals();
    this.setupInteractions();

    scene.add.existing(this);
  }

  private getMoleculeProperties(type: MoleculeType): MoleculeProperties {
    const moleculeDatabase: Record<MoleculeType, MoleculeProperties> = {
      [MoleculeType.GLUCOSE]: {
        id: 'glucose',
        type: MoleculeType.GLUCOSE,
        name: 'Glucose',
        formula: 'C₆H₁₂O₆',
        molecularWeight: 180.16,
        color: 0x4CAF50,
        size: 1.2,
        energyContent: 686
      },
      [MoleculeType.PYRUVATE]: {
        id: 'pyruvate',
        type: MoleculeType.PYRUVATE,
        name: 'Pyruvate',
        formula: 'C₃H₄O₃',
        molecularWeight: 88.06,
        color: 0xFF9800,
        size: 0.8,
        energyContent: 343
      },
      [MoleculeType.ATP]: {
        id: 'atp',
        type: MoleculeType.ATP,
        name: 'ATP',
        formula: 'C₁₀H₁₆N₅O₁₃P₃',
        molecularWeight: 507.18,
        color: 0xF44336,
        size: 1.0,
        energyContent: 30.5
      },
      [MoleculeType.ADP]: {
        id: 'adp',
        type: MoleculeType.ADP,
        name: 'ADP',
        formula: 'C₁₀H₁₅N₅O₁₀P₂',
        molecularWeight: 427.20,
        color: 0xE91E63,
        size: 0.9,
        energyContent: 20.5
      },
      [MoleculeType.NADH]: {
        id: 'nadh',
        type: MoleculeType.NADH,
        name: 'NADH',
        formula: 'C₂₁H₂₉N₇O₁₄P₂',
        molecularWeight: 665.44,
        color: 0x2196F3,
        size: 1.1,
        energyContent: 52.6
      },
      [MoleculeType.NAD]: {
        id: 'nad',
        type: MoleculeType.NAD,
        name: 'NAD⁺',
        formula: 'C₂₁H₂₇N₇O₁₄P₂',
        molecularWeight: 663.43,
        color: 0x3F51B5,
        size: 1.1,
        energyContent: 0
      },
      [MoleculeType.PHOSPHATE]: {
        id: 'phosphate',
        type: MoleculeType.PHOSPHATE,
        name: 'Phosphate',
        formula: 'PO₄³⁻',
        molecularWeight: 94.97,
        color: 0xFFEB3B,
        size: 0.6,
        energyContent: 0
      },
      [MoleculeType.GLUCOSE_6_PHOSPHATE]: {
        id: 'glucose_6_phosphate',
        type: MoleculeType.GLUCOSE_6_PHOSPHATE,
        name: 'Glucose-6-P',
        formula: 'C₆H₁₃O₉P',
        molecularWeight: 260.14,
        color: 0x8BC34A,
        size: 1.0,
        energyContent: 0
      },
      [MoleculeType.FRUCTOSE_6_PHOSPHATE]: {
        id: 'fructose_6_phosphate',
        type: MoleculeType.FRUCTOSE_6_PHOSPHATE,
        name: 'Fructose-6-P',
        formula: 'C₆H₁₃O₉P',
        molecularWeight: 260.14,
        color: 0x9C27B0,
        size: 1.0,
        energyContent: 0
      },
      [MoleculeType.FRUCTOSE_1_6_BISPHOSPHATE]: {
        id: 'fructose_1_6_bisphosphate',
        type: MoleculeType.FRUCTOSE_1_6_BISPHOSPHATE,
        name: 'Fructose-1,6-BP',
        formula: 'C₆H₁₄O₁₂P₂',
        molecularWeight: 340.12,
        color: 0x673AB7,
        size: 1.1,
        energyContent: 0
      },
      [MoleculeType.DIHYDROXYACETONE_PHOSPHATE]: {
        id: 'dihydroxyacetone_phosphate',
        type: MoleculeType.DIHYDROXYACETONE_PHOSPHATE,
        name: 'DHAP',
        formula: 'C₃H₇O₆P',
        molecularWeight: 170.06,
        color: 0x795548,
        size: 0.8,
        energyContent: 0
      },
      [MoleculeType.GLYCERALDEHYDE_3_PHOSPHATE]: {
        id: 'glyceraldehyde_3_phosphate',
        type: MoleculeType.GLYCERALDEHYDE_3_PHOSPHATE,
        name: 'G3P',
        formula: 'C₃H₇O₆P',
        molecularWeight: 170.06,
        color: 0x607D8B,
        size: 0.8,
        energyContent: 0
      },
      [MoleculeType.ONE_3_BISPHOSPHOGLYCERATE]: {
        id: '1_3_bisphosphoglycerate',
        type: MoleculeType.ONE_3_BISPHOSPHOGLYCERATE,
        name: '1,3-BPG',
        formula: 'C₃H₈O₁₀P₂',
        molecularWeight: 266.04,
        color: 0x009688,
        size: 0.9,
        energyContent: 0
      },
      [MoleculeType.THREE_PHOSPHOGLYCERATE]: {
        id: '3_phosphoglycerate',
        type: MoleculeType.THREE_PHOSPHOGLYCERATE,
        name: '3-PG',
        formula: 'C₃H₇O₇P',
        molecularWeight: 186.06,
        color: 0x00BCD4,
        size: 0.8,
        energyContent: 0
      },
      [MoleculeType.TWO_PHOSPHOGLYCERATE]: {
        id: '2_phosphoglycerate',
        type: MoleculeType.TWO_PHOSPHOGLYCERATE,
        name: '2-PG',
        formula: 'C₃H₇O₇P',
        molecularWeight: 186.06,
        color: 0x03A9F4,
        size: 0.8,
        energyContent: 0
      },
      [MoleculeType.PHOSPHOENOLPYRUVATE]: {
        id: 'phosphoenolpyruvate',
        type: MoleculeType.PHOSPHOENOLPYRUVATE,
        name: 'PEP',
        formula: 'C₃H₅O₆P',
        molecularWeight: 168.04,
        color: 0x00E676,
        size: 0.8,
        energyContent: 61.9
      },
      [MoleculeType.WATER]: {
        id: 'water',
        type: MoleculeType.WATER,
        name: 'Water',
        formula: 'H₂O',
        molecularWeight: 18.02,
        color: 0x29B6F6,
        size: 0.5,
        energyContent: 0
      },
      [MoleculeType.LACTATE]: {
        id: 'lactate',
        type: MoleculeType.LACTATE,
        name: 'Lactate',
        formula: 'C₃H₆O₃',
        molecularWeight: 90.08,
        color: 0xFF7043,
        size: 0.8,
        energyContent: 0
      }
    };

    return moleculeDatabase[type];
  }

  private createVisuals(): void {
    const scale = this.properties.size * 20;
    
    this.moleculeSprite = this.scene.add.graphics();
    this.moleculeSprite.fillStyle(this.properties.color);
    this.moleculeSprite.fillCircle(0, 0, scale);
    this.add(this.moleculeSprite);

    this.labelText = this.scene.add.text(0, scale + 15, this.properties.name, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
    });
    this.labelText.setOrigin(0.5);
    this.add(this.labelText);
  }

  private setupInteractions(): void {
    this.setSize(this.properties.size * 40, this.properties.size * 40);
    this.setInteractive();

    this.on('pointerover', () => {
      this.setScale(1.1);
    });

    this.on('pointerout', () => {
      this.setScale(1);
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
      },
    });
  }

  public highlight(): void {
    this.scene.tweens.add({
      targets: this.moleculeSprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  public getEnergyContent(): number {
    return this.properties.energyContent || 0;
  }
}