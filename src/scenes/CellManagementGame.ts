
interface CellVisuals {
  cytoplasm: Phaser.GameObjects.Graphics;
  nucleus: Phaser.GameObjects.Graphics;
  mitochondria: Phaser.GameObjects.Graphics[]; // Changed to Graphics[] for detailed mitochondria
  pathwayIndicators?: {
    glycolysis: Phaser.GameObjects.Graphics;
    respiration: Phaser.GameObjects.Graphics;
    protein_synthesis: Phaser.GameObjects.Graphics;
    lipid_synthesis: Phaser.GameObjects.Graphics;
    waste_removal: Phaser.GameObjects.Graphics;
    nucleotide_synthesis: Phaser.GameObjects.Graphics;
    dna_synthesis: Phaser.GameObjects.Graphics;
  };
  roughER?: Phaser.GameObjects.Graphics;
  golgi?: Phaser.GameObjects.Graphics;
  lysosomes?: Phaser.GameObjects.Graphics[];
  peroxisomes?: Phaser.GameObjects.Graphics[];
  nucleolus?: Phaser.GameObjects.Graphics;
  cytoskeleton?: Phaser.GameObjects.Graphics;
}

interface CellularProcess {
  id: string;
  name: string;
  active: boolean;
  efficiency: number;
  requirements: { molecule: string; amount: number }[];
  products: { molecule: string; amount: number }[];
  energyCost: number;
  description: string;
  unlocked?: boolean;
  duration: number; // How long process stays active (in update cycles)
  timeRemaining: number; // Time left before auto-shutoff
  conflictsWith: string[]; // Processes that cannot run simultaneously
}

interface MoleculeStock {
  [key: string]: number;
}

interface CellularObjective {
  id: string;
  name: string;
  description: string;
  purpose: string; // WHY this matters
  requirements: { molecule: string; amount: number }[];
  rewards: string[];
  unlocks: string[];
  category: 'survival' | 'growth' | 'specialization' | 'reproduction';
  completed: boolean;
  progress: number;
}

interface ResearchPath {
  id: string;
  name: string;
  description: string;
  vision: string; // The ultimate goal this leads to
  stages: {
    name: string;
    requirements: { molecule: string; amount: number }[];
    benefit: string;
    completed: boolean;
  }[];
  currentStage: number;
}

export class CellManagementGame extends Phaser.Scene {
  private moleculeStocks: MoleculeStock = {
    glucose: 20,
    oxygen: 25, // Increased from 15 to 25
    water: 50,
    atp: 10,
    pyruvate: 0, // Added for glycolysis-respiration pathway
    co2: 5,
    waste: 0
  };
  
  private previousMoleculeStocks: MoleculeStock = {};
  private moleculeCapacities: MoleculeStock = {
    glucose: 300,
    oxygen: 200,
    water: 500,
    atp: 600,
    pyruvate: 50, // Intermediate metabolite - smaller capacity
    amino_acids: 150,
    proteins: 200, // Increased from 50 to 200 for neural network building
    lipids: 120,
    fatty_acids: 100,
    nucleotides: 80,
    rna: 40,
    dna: 25,
    co2: 150,
    waste: 300,
    enzymes: 60,
    organelles: 30
  };
  
  private cellularProcesses: CellularProcess[] = [];
  private currentObjectives: CellularObjective[] = [];
  private researchPaths: ResearchPath[] = [];
  private cellPurpose: string = 'Undifferentiated'; // What is this cell trying to become?
  private activeEvents: any[] = [];
  private cellVisuals!: CellVisuals;
  
  private cellHealth: number = 100;
  private energyLevel: number = 50;
  private difficulty: number = 1;
  private cellSize: number = 1; // New: cell growth metric
  private reproductionProgress: number = 0; // New: progress toward cell division
  private goals: { name: string; description: string; target: number; current: number; completed: boolean }[] = [];
  private achievements: string[] = [];
  private efficiency: number = 1.0;
  private day: number = 1;
  private timeOfDay: number = 0; // 0-24 hours
  
  // Game mechanics
  private autoProcessTimer: number = 0;
  private eventTimer: number = 0;
  
  // UI Elements
  private stockDisplays: Map<string, Phaser.GameObjects.Text> = new Map();
  private progressBarDisplays: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private processButtons: Map<string, Phaser.GameObjects.Container> = new Map();
  private alertPanel!: Phaser.GameObjects.Container;
  private statusPanel!: Phaser.GameObjects.Container;
  private eventPanel!: Phaser.GameObjects.Container;
  private processInfoPanel!: Phaser.GameObjects.Container;
  private processInfoText!: Phaser.GameObjects.Text;
  private healthFactors: Array<{factor: string, impact: number, description: string}> = [];
  private healthMonitor!: Phaser.GameObjects.Container;
  
  // Notification system
  private recentNotifications: Map<string, number> = new Map();
  private lastUIUpdate: number = 0;
  
  // Visual effects
  private particles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private cellCenter = { x: 400, y: 400 };

  // Time control system
  private gameSpeed: number = 1.0; // 1.0 = normal speed, 0.5 = half speed, 0 = paused
  private isPaused: boolean = false;
  private timeControlPanel!: Phaser.GameObjects.Container;
  private speedDisplay!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'CellManagementGame' });
    this.initializeProcesses();
  }

  private initializeProcesses(): void {
    this.cellularProcesses = [
      {
        id: 'glycolysis',
        name: 'Glycolysis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'glucose', amount: 1 }],
        products: [{ molecule: 'atp', amount: 2 }, { molecule: 'pyruvate', amount: 2 }], // Net 2 ATP from glycolysis
        energyCost: 0,
        description: 'Fast ATP production (no oxygen needed, but very inefficient)'
      },
      {
        id: 'respiration',
        name: 'Cellular Respiration',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'pyruvate', amount: 2 }, { molecule: 'oxygen', amount: 6 }], // Uses pyruvate from glycolysis
        products: [{ molecule: 'atp', amount: 28 }, { molecule: 'co2', amount: 6 }, { molecule: 'water', amount: 6 }], // Balanced: total 30 ATP per glucose
        energyCost: 0,
        description: 'Highly efficient ATP production (uses pyruvate from glycolysis + oxygen)',
        duration: 15,
        timeRemaining: 0,
        conflictsWith: ['fermentation'] // Can't do both respiration and fermentation simultaneously
      },
      {
        id: 'fermentation',
        name: 'Fermentation',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'pyruvate', amount: 2 }], // Alternative to respiration when oxygen is low
        products: [{ molecule: 'atp', amount: 0 }, { molecule: 'waste', amount: 2 }], // No additional ATP, produces waste
        energyCost: 0,
        description: 'Emergency energy pathway (no oxygen needed, but produces waste and no extra ATP)',
        unlocked: true,
        duration: 10,
        timeRemaining: 0,
        conflictsWith: ['respiration'] // Can't do both respiration and fermentation simultaneously
      },
      {
        id: 'amino_acid_synthesis',
        name: 'Amino Acid Synthesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'glucose', amount: 2 }, { molecule: 'atp', amount: 4 }],
        products: [{ molecule: 'amino_acids', amount: 8 }],
        energyCost: 2,
        description: 'Convert glucose into amino acids for protein synthesis'
      },
      {
        id: 'protein_synthesis',
        name: 'Protein Synthesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'atp', amount: 10 }, { molecule: 'amino_acids', amount: 5 }],
        products: [{ molecule: 'proteins', amount: 1 }],
        energyCost: 3,
        description: 'Build proteins from amino acids (requires amino acid synthesis first)'
      },
      {
        id: 'waste_removal',
        name: 'Waste Removal',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'atp', amount: 2 }],
        products: [{ molecule: 'waste', amount: -10 }], // Focus on cellular waste, not CO2
        energyCost: 1, // Reduced from 3 to 1
        description: 'Remove toxic cellular waste (CO2 diffuses out naturally)'
      },
      {
        id: 'oxygen_transport',
        name: 'Oxygen Transport',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'atp', amount: 2 }],
        products: [{ molecule: 'oxygen', amount: 8 }],
        energyCost: 1, // Reduced from 2 to 1
        description: 'Actively transport oxygen into the cell'
      },
      {
        id: 'glucose_uptake',
        name: 'Glucose Uptake',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'atp', amount: 3 }],
        products: [{ molecule: 'glucose', amount: 12 }],
        energyCost: 1,
        description: 'Actively transport glucose from bloodstream'
      },
      {
        id: 'nucleotide_uptake',
        name: 'Nucleotide Uptake',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'atp', amount: 4 }],
        products: [{ molecule: 'nucleotides', amount: 8 }],
        energyCost: 1,
        description: 'Import nucleotides from cellular environment'
      },
      {
        id: 'dna_synthesis',
        name: 'DNA Synthesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'nucleotides', amount: 6 }, { molecule: 'atp', amount: 12 }],
        products: [{ molecule: 'dna', amount: 1 }],
        energyCost: 3,
        description: 'Basic DNA synthesis from nucleotides for genetic storage'
      },
      {
        id: 'lipid_synthesis',
        name: 'Lipid Synthesis', 
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'glucose', amount: 3 }, { molecule: 'atp', amount: 6 }],
        products: [{ molecule: 'lipids', amount: 4 }],
        energyCost: 2,
        description: 'Convert glucose into lipids for membrane repair'
      },
      {
        id: 'membrane_repair',
        name: 'Membrane Repair',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'atp', amount: 8 }, { molecule: 'lipids', amount: 2 }],
        products: [{ molecule: 'organelles', amount: 1 }],
        energyCost: 2,
        description: 'Repair cell membrane using lipids, building new organelles',
        duration: 30,
        timeRemaining: 0,
        conflictsWith: []
      },
      // ADVANCED METABOLIC PATHWAYS
      {
        id: 'fatty_acid_synthesis',
        name: 'Fatty Acid Synthesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'glucose', amount: 4 }, { molecule: 'atp', amount: 12 }],
        products: [{ molecule: 'fatty_acids', amount: 6 }],
        energyCost: 3,
        description: 'Convert glucose into fatty acids for energy storage and signaling',
        unlocked: true // Made available from start
      },
      {
        id: 'cholesterol_synthesis',
        name: 'Cholesterol Synthesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'fatty_acids', amount: 3 }, { molecule: 'atp', amount: 15 }],
        products: [{ molecule: 'cholesterol', amount: 2 }],
        energyCost: 4,
        description: 'Produce cholesterol for membrane fluidity and hormone precursors',
        unlocked: true // Made available when fatty acids are available
      },
      {
        id: 'nucleotide_synthesis',
        name: 'Nucleotide Synthesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'amino_acids', amount: 3 }, { molecule: 'glucose', amount: 2 }, { molecule: 'atp', amount: 8 }],
        products: [{ molecule: 'nucleotides', amount: 6 }],
        energyCost: 3,
        description: 'Synthesize nucleotides for DNA/RNA synthesis',
        unlocked: true // Basic metabolic process should be available
      },
      {
        id: 'rna_synthesis',
        name: 'RNA Synthesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'nucleotides', amount: 4 }, { molecule: 'atp', amount: 6 }],
        products: [{ molecule: 'rna', amount: 3 }],
        energyCost: 2,
        description: 'Transcribe genes into RNA for protein synthesis',
        unlocked: true // Basic transcription should be available
      },
      {
        id: 'dna_replication',
        name: 'DNA Replication',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'atp', amount: 25 }, { molecule: 'nucleotides', amount: 8 }],
        products: [{ molecule: 'dna', amount: 1 }],
        energyCost: 8,
        description: 'Replicate DNA in preparation for cell division',
        unlocked: true // DNA replication should be available
      },
      {
        id: 'enzyme_production',
        name: 'Enzyme Production',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'proteins', amount: 2 }, { molecule: 'rna', amount: 1 }, { molecule: 'atp', amount: 10 }],
        products: [{ molecule: 'enzymes', amount: 4 }],
        energyCost: 3,
        description: 'Produce specialized enzymes to boost process efficiency',
        unlocked: true // Enzyme production should be available
      },
      // CELL GROWTH AND DIVISION PATHWAY
      {
        id: 'organelle_biogenesis',
        name: 'Organelle Biogenesis',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'proteins', amount: 3 }, { molecule: 'lipids', amount: 4 }, { molecule: 'atp', amount: 20 }],
        products: [{ molecule: 'organelles', amount: 1 }],
        energyCost: 5,
        description: 'Build new organelles to increase cellular capacity',
        unlocked: true // Essential for cell growth
      },
      {
        id: 'cell_division',
        name: 'Cell Division',
        active: false,
        efficiency: 1.0,
        requirements: [{ molecule: 'dna', amount: 1 }, { molecule: 'organelles', amount: 2 }, { molecule: 'proteins', amount: 5 }, { molecule: 'atp', amount: 50 }],
        products: [],
        energyCost: 15,
        description: 'Divide into two cells - ultimate goal of cellular life!',
        unlocked: false,
        duration: 30, // Very short duration - must be carefully timed
        timeRemaining: 0,
        conflictsWith: ['glycolysis', 'respiration'] // Cannot divide while actively metabolizing
      }
    ];

    // Add default properties to processes that don't have them
    this.cellularProcesses.forEach(process => {
      if (!process.hasOwnProperty('duration')) {
        process.duration = this.getProcessDuration(process.id);
        process.timeRemaining = 0;
        process.conflictsWith = this.getProcessConflicts(process.id);
      }
    });
  }

  create(): void {
    const { width, height } = this.scale;

    // Initialize previous molecule stocks for delta calculation
    this.previousMoleculeStocks = { ...this.moleculeStocks };

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a252f);
    
    // Create a simple white texture for particles
    this.add.graphics().fillStyle(0xffffff).fillCircle(0, 0, 2).generateTexture('white', 4, 4);
    
    this.createUI();
    this.createCellVisualization();
    this.createProcessControls();
    this.createProcessInfoPanel();
    this.createStatusDisplay();
    this.createHealthMonitor();
    this.createTimeControls();
    this.initializeObjectives();
    this.initializeResearchPaths();
    this.createPurposeDisplay();
    this.startGameLoop();
    
    // Tutorial message
    this.showTutorialMessage();
  }

  private createUI(): void {
    const { width, height } = this.scale;

    // Title
    this.add.text(width / 2, 30, 'Cell Management Game', {
      fontSize: '32px', // Much larger: increased from 24px
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Day/Time display  
    const dayTimeText = this.add.text(width - 20, 30, `Day ${this.day} - ${Math.floor(this.timeOfDay)}:00`, {
      fontSize: '20px', // Much larger: increased from 16px
      color: '#3498db',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
    
    // Store reference for updating
    (this as any).dayTimeDisplay = dayTimeText;

    // Molecule stock panel
    this.createStockPanel();
    
    // Alert panel
    this.createAlertPanel();
  }

  private createCellVisualization(): void {
    const { width, height } = this.scale;
    
    // Much larger cell visualization with detailed organelles
    const cellX = width / 2 - 50;
    const cellY = height / 2 + 50;
    this.cellCenter = { x: cellX, y: cellY };
    
    // Much larger cell membrane with phospholipid bilayer effect
    const cellMembrane = this.add.graphics();
    cellMembrane.lineStyle(6, 0x3498db, 0.9);
    cellMembrane.strokeCircle(cellX, cellY, 180); // Increased from 120 to 180
    // Add inner membrane layer for bilayer effect
    cellMembrane.lineStyle(2, 0x2980b9, 0.6);
    cellMembrane.strokeCircle(cellX, cellY, 176);
    
    // Cell cytoplasm - changes color based on energy with texture
    const cytoplasm = this.add.graphics();
    cytoplasm.fillStyle(0x2c3e50, 0.3);
    cytoplasm.fillCircle(cellX, cellY, 175); // Increased from 118 to 175
    // Add cytoplasmic streaming lines
    cytoplasm.lineStyle(1, 0x34495e, 0.2);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const startX = cellX + Math.cos(angle) * 40;
      const startY = cellY + Math.sin(angle) * 40;
      const endX = cellX + Math.cos(angle) * 160;
      const endY = cellY + Math.sin(angle) * 160;
      cytoplasm.moveTo(startX, startY);
      cytoplasm.lineTo(endX, endY);
    }
    cytoplasm.strokePath();
    
    // Larger nucleus with nuclear envelope
    const nucleus = this.add.graphics();
    nucleus.fillStyle(0x9b59b6, 0.7);
    nucleus.fillCircle(cellX, cellY - 30, 50); // Increased from 35 to 50
    // Nuclear envelope (double membrane)
    nucleus.lineStyle(3, 0x8e44ad, 0.8);
    nucleus.strokeCircle(cellX, cellY - 30, 50);
    nucleus.lineStyle(1, 0x8e44ad, 0.4);
    nucleus.strokeCircle(cellX, cellY - 30, 47);
    
    // Nucleolus inside nucleus
    const nucleolus = this.add.graphics();
    nucleolus.fillStyle(0x8e44ad, 0.9);
    nucleolus.fillCircle(cellX - 10, cellY - 35, 12);
    
    // More realistic mitochondria with cristae
    const createMitochondrion = (x: number, y: number, width: number, height: number) => {
      const mito = this.add.graphics();
      mito.fillStyle(0xe74c3c, 0.8);
      mito.fillEllipse(x, y, width, height);
      mito.lineStyle(2, 0xc0392b, 0.9);
      mito.strokeEllipse(x, y, width, height);
      // Add cristae (internal membranes)
      mito.lineStyle(1, 0xc0392b, 0.6);
      for (let i = 0; i < 3; i++) {
        const offsetY = (i - 1) * (height / 6);
        mito.moveTo(x - width/3, y + offsetY);
        mito.lineTo(x + width/3, y + offsetY);
      }
      mito.strokePath();
      return mito;
    };
    
    const mito1 = createMitochondrion(cellX - 80, cellY + 50, 40, 20);
    const mito2 = createMitochondrion(cellX + 70, cellY + 40, 38, 18);
    const mito3 = createMitochondrion(cellX - 30, cellY + 90, 35, 16);
    const mito4 = createMitochondrion(cellX + 90, cellY - 50, 32, 15);
    const mito5 = createMitochondrion(cellX - 100, cellY - 20, 36, 17);
    const mito6 = createMitochondrion(cellX + 30, cellY + 110, 34, 16);
    
    // Detailed Endoplasmic Reticulum network
    const roughER = this.add.graphics();
    roughER.lineStyle(3, 0x27ae60, 0.7);
    // Create a network of ER tubules
    const erPoints = [
      [cellX - 100, cellY - 60], [cellX - 70, cellY - 70], [cellX - 45, cellY - 65],
      [cellX - 50, cellY - 40], [cellX - 25, cellY - 45], [cellX - 30, cellY - 20],
      [cellX - 10, cellY - 25], [cellX + 15, cellY - 30], [cellX + 40, cellY - 25]
    ];
    roughER.beginPath();
    roughER.moveTo(erPoints[0][0], erPoints[0][1]);
    for (let i = 1; i < erPoints.length; i++) {
      roughER.lineTo(erPoints[i][0], erPoints[i][1]);
    }
    roughER.strokePath();
    
    // Add ribosomes on rough ER
    erPoints.forEach(([x, y], i) => {
      if (i % 2 === 0) {
        const ribosome = this.add.circle(x + 3, y + 3, 2, 0x2ecc71, 0.8);
      }
    });
    
    // Golgi apparatus with stacked cisternae
    const golgi = this.add.graphics();
    golgi.fillStyle(0xf39c12, 0.6);
    for (let i = 0; i < 5; i++) {
      const offsetY = i * 4;
      golgi.fillEllipse(cellX + 40, cellY - 60 + offsetY, 60, 8);
    }
    golgi.lineStyle(2, 0xe67e22, 0.8);
    for (let i = 0; i < 5; i++) {
      const offsetY = i * 4;
      golgi.strokeEllipse(cellX + 40, cellY - 60 + offsetY, 60, 8);
    }
    
    // Lysosomes scattered throughout cytoplasm
    const lysosomes: Phaser.GameObjects.Graphics[] = [];
    const lysosomePositions = [
      [cellX - 60, cellY + 20], [cellX + 50, cellY + 80], [cellX - 90, cellY + 80],
      [cellX + 110, cellY + 10], [cellX - 40, cellY - 80], [cellX + 80, cellY - 90]
    ];
    lysosomePositions.forEach(([x, y]) => {
      const lysosome = this.add.graphics();
      lysosome.fillStyle(0xe74c3c, 0.7);
      lysosome.fillCircle(x, y, 8);
      lysosome.lineStyle(2, 0xc0392b, 0.8);
      lysosome.strokeCircle(x, y, 8);
      lysosomes.push(lysosome);
    });
    
    // Peroxisomes for lipid metabolism
    const peroxisomes: Phaser.GameObjects.Graphics[] = [];
    const peroxisomePositions = [
      [cellX - 120, cellY + 40], [cellX + 100, cellY - 20], [cellX - 20, cellY + 70]
    ];
    peroxisomePositions.forEach(([x, y]) => {
      const peroxisome = this.add.graphics();
      peroxisome.fillStyle(0x9b59b6, 0.6);
      peroxisome.fillCircle(x, y, 10);
      peroxisome.lineStyle(2, 0x8e44ad, 0.8);
      peroxisome.strokeCircle(x, y, 10);
      peroxisomes.push(peroxisome);
    });
    
    // Cytoskeleton (microtubules and microfilaments)
    const cytoskeleton = this.add.graphics();
    cytoskeleton.lineStyle(1, 0x95a5a6, 0.4);
    // Microtubules radiating from centrosome
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const startX = cellX + Math.cos(angle) * 20;
      const startY = cellY + Math.sin(angle) * 20;
      const endX = cellX + Math.cos(angle) * 160;
      const endY = cellY + Math.sin(angle) * 160;
      cytoskeleton.moveTo(startX, startY);
      cytoskeleton.lineTo(endX, endY);
    }
    cytoskeleton.strokePath();
    
    
    // Pathway indicators (initially invisible, will show when processes are active)
    const pathwayIndicators = {
      glycolysis: this.add.graphics().setVisible(false),
      respiration: this.add.graphics().setVisible(false),
      protein_synthesis: this.add.graphics().setVisible(false),
      lipid_synthesis: this.add.graphics().setVisible(false),
      waste_removal: this.add.graphics().setVisible(false),
      nucleotide_synthesis: this.add.graphics().setVisible(false),
      dna_synthesis: this.add.graphics().setVisible(false)
    };
    
    // Glycolysis pathway (cytoplasm glow) - larger for new cell size
    pathwayIndicators.glycolysis.fillStyle(0xffff00, 0.3);
    pathwayIndicators.glycolysis.fillCircle(cellX, cellY, 150);
    
    // Respiration pathway (mitochondria glow) - updated for new mitochondria
    pathwayIndicators.respiration.fillStyle(0xff6b6b, 0.4);
    pathwayIndicators.respiration.fillEllipse(cellX - 80, cellY + 50, 50, 30);
    pathwayIndicators.respiration.fillEllipse(cellX + 70, cellY + 40, 48, 28);
    pathwayIndicators.respiration.fillEllipse(cellX - 30, cellY + 90, 45, 26);
    pathwayIndicators.respiration.fillEllipse(cellX + 90, cellY - 50, 42, 25);
    pathwayIndicators.respiration.fillEllipse(cellX - 100, cellY - 20, 46, 27);
    pathwayIndicators.respiration.fillEllipse(cellX + 30, cellY + 110, 44, 26);
    
    // Protein synthesis pathway (ER and ribosome activity) - larger scale
    pathwayIndicators.protein_synthesis.fillStyle(0x4ecdc4, 0.5);
    pathwayIndicators.protein_synthesis.fillCircle(cellX - 90, cellY - 55, 20);
    pathwayIndicators.protein_synthesis.fillCircle(cellX - 60, cellY - 60, 18);
    pathwayIndicators.protein_synthesis.fillCircle(cellX - 35, cellY - 50, 16);
    pathwayIndicators.protein_synthesis.fillCircle(cellX - 15, cellY - 35, 14);
    
    // Lipid synthesis pathway (peroxisome activity) - larger scale
    pathwayIndicators.lipid_synthesis.fillStyle(0x9b59b6, 0.4);
    pathwayIndicators.lipid_synthesis.fillCircle(cellX - 120, cellY + 40, 25);
    pathwayIndicators.lipid_synthesis.fillCircle(cellX + 100, cellY - 20, 25);
    pathwayIndicators.lipid_synthesis.fillCircle(cellX - 20, cellY + 70, 25);
    
    // Waste removal pathway (movement toward membrane) - larger scale
    pathwayIndicators.waste_removal.lineStyle(4, 0xff9999, 0.6);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const startX = cellX + Math.cos(angle) * 80;
      const startY = cellY + Math.sin(angle) * 80;
      const endX = cellX + Math.cos(angle) * 170;
      const endY = cellY + Math.sin(angle) * 170;
      pathwayIndicators.waste_removal.moveTo(startX, startY);
      pathwayIndicators.waste_removal.lineTo(endX, endY);
    }
    pathwayIndicators.waste_removal.strokePath();
    
    // Nucleotide synthesis pathway (nuclear activity) - larger scale
    pathwayIndicators.nucleotide_synthesis.fillStyle(0x3498db, 0.5);
    pathwayIndicators.nucleotide_synthesis.fillCircle(cellX, cellY - 30, 65);
    
    // DNA synthesis pathway (nuclear DNA activity) - larger scale
    pathwayIndicators.dna_synthesis.fillStyle(0x9b59b6, 0.6);
    pathwayIndicators.dna_synthesis.fillCircle(cellX, cellY - 30, 70);
    pathwayIndicators.dna_synthesis.fillStyle(0x8e44ad, 0.4);
    pathwayIndicators.dna_synthesis.fillCircle(cellX, cellY - 30, 45);
    
    // Store references for dynamic updates
    this.cellVisuals = {
      cytoplasm,
      nucleus,
      mitochondria: [mito1, mito2, mito3, mito4, mito5, mito6], // Include all mitochondria as Graphics objects
      pathwayIndicators,
      roughER,
      golgi,
      lysosomes,
      peroxisomes,
      nucleolus,
      cytoskeleton
    };
    
    // Labels - moved further up for larger cell
    this.add.text(cellX, cellY - 240, 'Living Cell', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  // Add transcription factor system
  private createStockPanel(): void {
    // Compact panel that fits on screen properly
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2c3e50, 0.9);
    panelBg.fillRoundedRect(20, 70, 420, 480, 10); // Increased height to 480px
    
    this.add.text(40, 90, 'Molecule Inventory:', {
      fontSize: '24px', // Reduced from 28px
      color: '#ffffff',
      fontStyle: 'bold'
    });

    // Create stock displays with much larger text
    const molecules = [
      { key: 'glucose', name: 'Glucose', color: '#f39c12', critical: 5, target: 10 },
      { key: 'oxygen', name: 'Oxygen', color: '#e74c3c', critical: 3, target: 8 },
      { key: 'water', name: 'Water', color: '#3498db', critical: 10, target: 20 },
      { key: 'atp', name: 'ATP', color: '#2ecc71', critical: 5, target: 15 },
      { key: 'pyruvate', name: 'Pyruvate', color: '#ff6b6b', critical: 0, target: 4 },
      { key: 'amino_acids', name: 'Amino Acids', color: '#9b59b6', critical: 0, target: 8 },
      { key: 'lipids', name: 'Lipids', color: '#e67e22', critical: 0, target: 4 },
      { key: 'fatty_acids', name: 'Fatty Acids', color: '#f1c40f', critical: 0, target: 6 },
      { key: 'nucleotides', name: 'Nucleotides', color: '#1abc9c', critical: 0, target: 6 },
      { key: 'rna', name: 'RNA', color: '#3498db', critical: 0, target: 3 },
      { key: 'dna', name: 'DNA', color: '#9b59b6', critical: 0, target: 1 },
      { key: 'proteins', name: 'Proteins', color: '#e74c3c', critical: 0, target: 2 },
      { key: 'enzymes', name: 'Enzymes', color: '#f39c12', critical: 0, target: 4 },
      { key: 'organelles', name: 'Organelles', color: '#2ecc71', critical: 0, target: 2 },
      { key: 'co2', name: 'CO₂', color: '#95a5a6', critical: 10, target: 5 },
      { key: 'waste', name: 'Waste', color: '#8e44ad', critical: 15, target: 5 }
    ];

    molecules.forEach((mol, index) => {
      const y = 125 + index * 22; // Reduced spacing from 25 to 22, start at 125 instead of 140
      
      this.add.text(40, y, `${mol.name}:`, {
        fontSize: '14px', // Reduced from 16px to 14px
        color: mol.color,
        fontStyle: 'bold'
      });
      
      const stockText = this.add.text(180, y, `${Math.round(this.moleculeStocks[mol.key] || 0)}`, { // Round to whole numbers
        fontSize: '14px', // Reduced from 16px to 14px
        color: '#ffffff',
        fontStyle: 'bold'
      });
      
      // Show molecule change rate instead of critical/target levels
      const previousAmount = this.previousMoleculeStocks?.[mol.key];
      const currentAmount = this.moleculeStocks[mol.key] || 0;
      const delta = previousAmount !== undefined ? currentAmount - previousAmount : 0;
      const deltaText = delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? `${delta.toFixed(1)}` : '0.0';
      const deltaColor = delta > 0 ? '#2ecc71' : delta < 0 ? '#e74c3c' : '#95a5a6';
      
      const stockDelta = this.add.text(240, y, deltaText, {
        fontSize: '11px', // Reduced from 12px to 11px
        color: deltaColor
      });
      
      // Show storage capacity as progress bar
      const capacity = this.moleculeCapacities[mol.key] || 1000;
      const currentStock = this.moleculeStocks[mol.key] || 0;
      const fillRatio = Math.min(currentStock / capacity, 1.0);
      
      // Progress bar background
      const progressBg = this.add.graphics();
      progressBg.fillStyle(0x34495e, 0.8);
      progressBg.fillRoundedRect(290, y - 8, 100, 16, 3);
      
      // Progress bar fill
      const progressFill = this.add.graphics();
      const fillColor = fillRatio > 0.9 ? 0xe74c3c : fillRatio > 0.7 ? 0xf39c12 : 0x2ecc71;
      progressFill.fillStyle(fillColor, 0.8);
      const fillWidth = fillRatio > 0 ? Math.max(1, fillRatio * 96) : 0; // Only show fill if there's actual content
      if (fillWidth > 0) {
        progressFill.fillRoundedRect(292, y - 6, fillWidth, 12, 2);
      }
      
      // Capacity text overlay
      const capacityText = this.add.text(340, y, `${Math.round(currentStock)}/${capacity}`, {
        fontSize: '9px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      // Status indicator
      const current = this.moleculeStocks[mol.key] || 0;
      let status = '●';
      let statusColor = '#2ecc71'; // Good
      
      if ((mol.key === 'waste' || mol.key === 'co2') && current > mol.critical) {
        status = '⚠';
        statusColor = '#e74c3c'; // Too high
      } else if (current < mol.critical) {
        status = '⚠';
        statusColor = '#e74c3c'; // Too low
      } else if (current < mol.target) {
        status = '●';
        statusColor = '#f39c12'; // OK but could be better
      }
      
      const statusIndicator = this.add.text(400, y, status, { // Moved after progress bar (290+100+10)
        fontSize: '16px', // Smaller status indicator
        color: statusColor,
        fontStyle: 'bold'
      });
      
      // Removed tooltips - they were cluttering the interface
      
      this.stockDisplays.set(mol.key, stockText);
      this.stockDisplays.set(`${mol.key}_delta`, stockDelta);
      this.stockDisplays.set(`${mol.key}_status`, statusIndicator);
      this.stockDisplays.set(`${mol.key}_capacity`, capacityText);
      
      // Store progress bar references for updates
      this.progressBarDisplays.set(`${mol.key}_progressBg`, progressBg);
      this.progressBarDisplays.set(`${mol.key}_progressFill`, progressFill);
    });
  }

  private updateMoleculeDisplays(): void {
    const molecules = [
      { key: 'glucose', name: 'Glucose', color: '#f39c12', critical: 5, target: 10 },
      { key: 'oxygen', name: 'Oxygen', color: '#e74c3c', critical: 3, target: 8 },
      { key: 'water', name: 'Water', color: '#3498db', critical: 10, target: 20 },
      { key: 'atp', name: 'ATP', color: '#2ecc71', critical: 5, target: 15 },
      { key: 'pyruvate', name: 'Pyruvate', color: '#ff6b6b', critical: 0, target: 4 },
      { key: 'amino_acids', name: 'Amino Acids', color: '#9b59b6', critical: 0, target: 8 },
      { key: 'lipids', name: 'Lipids', color: '#e67e22', critical: 0, target: 4 },
      { key: 'fatty_acids', name: 'Fatty Acids', color: '#f1c40f', critical: 0, target: 6 },
      { key: 'nucleotides', name: 'Nucleotides', color: '#1abc9c', critical: 0, target: 6 },
      { key: 'rna', name: 'RNA', color: '#3498db', critical: 0, target: 3 },
      { key: 'dna', name: 'DNA', color: '#9b59b6', critical: 0, target: 1 },
      { key: 'proteins', name: 'Proteins', color: '#e74c3c', critical: 0, target: 2 },
      { key: 'enzymes', name: 'Enzymes', color: '#f39c12', critical: 0, target: 4 },
      { key: 'organelles', name: 'Organelles', color: '#2ecc71', critical: 0, target: 2 },
      { key: 'co2', name: 'CO₂', color: '#95a5a6', critical: 10, target: 5 },
      { key: 'waste', name: 'Waste', color: '#8e44ad', critical: 15, target: 5 }
    ];

    molecules.forEach((mol) => {
      // Update stock text
      const stockText = this.stockDisplays.get(mol.key);
      if (stockText) {
        stockText.setText(`${Math.round(this.moleculeStocks[mol.key] || 0)}`);
      }

      // Update delta text
      const deltaText = this.stockDisplays.get(`${mol.key}_delta`);
      if (deltaText) {
        const previousAmount = this.previousMoleculeStocks?.[mol.key];
        const currentAmount = this.moleculeStocks[mol.key] || 0;
        const delta = previousAmount !== undefined ? currentAmount - previousAmount : 0;
        const deltaString = delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? `${delta.toFixed(1)}` : '0.0';
        const deltaColor = delta > 0 ? '#2ecc71' : delta < 0 ? '#e74c3c' : '#95a5a6';
        
        deltaText.setText(deltaString);
        deltaText.setColor(deltaColor);
      }

      // Update status indicator
      const statusIndicator = this.stockDisplays.get(`${mol.key}_status`);
      if (statusIndicator) {
        const current = this.moleculeStocks[mol.key] || 0;
        let status = '●';
        let statusColor = '#2ecc71'; // Good
        
        if ((mol.key === 'waste' || mol.key === 'co2') && current > mol.critical) {
          status = '⚠';
          statusColor = '#e74c3c'; // Too high
        } else if (current < mol.critical) {
          status = '⚠';
          statusColor = '#e74c3c'; // Too low
        } else if (current < mol.target) {
          status = '●';
          statusColor = '#f39c12'; // OK but could be better
        }
        
        statusIndicator.setText(status);
        statusIndicator.setColor(statusColor);
      }

      // Update capacity text
      const capacityText = this.stockDisplays.get(`${mol.key}_capacity`);
      if (capacityText) {
        const capacity = this.moleculeCapacities[mol.key] || 1000;
        const currentStock = this.moleculeStocks[mol.key] || 0;
        capacityText.setText(`${Math.round(currentStock)}/${capacity}`);
      }

      // Update progress bars
      const progressBg = this.progressBarDisplays.get(`${mol.key}_progressBg`);
      const progressFill = this.progressBarDisplays.get(`${mol.key}_progressFill`);
      
      if (progressBg && progressFill) {
        const capacity = this.moleculeCapacities[mol.key] || 1000;
        const currentStock = this.moleculeStocks[mol.key] || 0;
        const fillRatio = Math.min(currentStock / capacity, 1.0);
        
        // Clear and redraw progress fill
        progressFill.clear();
        const fillColor = fillRatio > 0.9 ? 0xe74c3c : fillRatio > 0.7 ? 0xf39c12 : 0x2ecc71;
        progressFill.fillStyle(fillColor, 0.8);
        const fillWidth = fillRatio > 0 ? Math.max(1, fillRatio * 96) : 0;
        if (fillWidth > 0) {
          // Calculate the y position based on molecule index - updated to match createStockPanel spacing
          const y = 125 + molecules.findIndex(m => m.key === mol.key) * 22;
          progressFill.fillRoundedRect(292, y - 6, fillWidth, 12, 2);
        }
      }
    });
  }

  private createProcessControls(): void {
    const { width, height } = this.scale;
    
    // Smaller panel positioned better
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x34495e, 0.9);
    panelBg.fillRoundedRect(width - 380, 70, 360, height - 220, 10); // Fits screen properly
    
    this.add.text(width - 360, 90, 'Cellular Processes:', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    // Two column layout to fit more processes - only show unlocked ones
    const unlockedProcesses = this.cellularProcesses.filter(p => p.unlocked !== false);
    unlockedProcesses.forEach((process, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = width - 280 + (col * 160); // Two columns
      const y = 140 + row * 80; // Tighter spacing
      
      this.createProcessButton(process, x, y);
    });
  }

  private createProcessInfoPanel(): void {
    const { width, height } = this.scale;
    
    // Create fixed info panel at bottom center-right
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2c3e50, 0.95);
    panelBg.lineStyle(2, 0x34495e, 1);
    panelBg.fillRoundedRect(width / 2 + 50, height - 150, 400, 120, 10);
    panelBg.strokeRoundedRect(width / 2 + 50, height - 150, 400, 120, 10);
    
    // Title
    this.add.text(width / 2 + 60, height - 140, 'Process Information:', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    // Content text (initially empty)
    this.processInfoText = this.add.text(width / 2 + 60, height - 115, 'Hover over a process to see details...', {
      fontSize: '12px',
      color: '#bdc3c7',
      wordWrap: { width: 380 }
    });
    
    this.processInfoPanel = this.add.container(0, 0, [panelBg, this.processInfoText]);
  }

  private createProcessButton(process: CellularProcess, x: number, y: number): void {
    const container = this.add.container(x, y);
    
    // Smaller, more compact button
    const bg = this.add.graphics();
    this.updateProcessButtonVisual(bg, process);
    
    // Process name - smaller text
    const nameText = this.add.text(0, -25, process.name, {
      fontSize: '14px', // Much smaller
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 140 }
    });
    nameText.setOrigin(0.5);
    
    // Requirements/Products info - much smaller
    const infoText = this.add.text(0, 8, this.getProcessInfo(process), {
      fontSize: '10px', // Much smaller
      color: '#bdc3c7',
      align: 'center',
      wordWrap: { width: 140 }
    });
    infoText.setOrigin(0.5);
    
    container.add([bg, nameText, infoText]);
    container.setSize(150, 60); // Much smaller
    container.setInteractive();
    
    container.on('pointerdown', () => {
      this.toggleProcess(process);
    });
    
    container.on('pointerover', () => {
      this.updateProcessInfo(process);
    });
    
    container.on('pointerout', () => {
      this.updateProcessInfo(null);
    });
    
    this.processButtons.set(process.id, container);
  }

  private updateProcessButtonVisual(bg: Phaser.GameObjects.Graphics, process: CellularProcess): void {
    bg.clear();
    
    const canRun = this.canRunProcess(process);
    let color = 0x7f8c8d; // Gray for can't run
    
    if (process.active) {
      color = 0x2ecc71; // Green for active
    } else if (canRun) {
      color = 0x3498db; // Blue for can run
    }
    
    bg.fillStyle(color, 0.8);
    bg.fillRoundedRect(-75, -30, 150, 60, 8); // Smaller button size
    
    if (process.active) {
      // Add pulsing glow effect for active processes
      const pulse = Math.sin(this.time.now * 0.008) * 0.3 + 0.7;
      bg.lineStyle(2, 0x2ecc71, pulse);
      bg.strokeRoundedRect(-75, -30, 150, 60, 8);
    }
  }

  private updateAllProcessButtonVisuals(): void {
    this.cellularProcesses.forEach(process => {
      const button = this.processButtons.get(process.id);
      if (button) {
        const bg = button.getAt(0) as Phaser.GameObjects.Graphics;
        this.updateProcessButtonVisual(bg, process);
      }
    });
  }

  private getProcessInfo(process: CellularProcess): string {
    const reqText = process.requirements.map(req => 
      `${req.amount} ${req.molecule}`
    ).join(', ');
    
    const prodText = process.products.map(prod => 
      `${prod.amount} ${prod.molecule}`
    ).join(', ');
    
    return `Needs: ${reqText}\nProduces: ${prodText}`;
  }

  private updateProcessInfo(process: CellularProcess | null): void {
    if (!process) {
      this.processInfoText.setText('Hover over a process to see details...');
      this.processInfoText.setColor('#bdc3c7');
      return;
    }
    
    const reqText = process.requirements.map(req => 
      `${req.amount} ${req.molecule}`
    ).join(', ');
    
    const prodText = process.products.map(prod => 
      `${prod.amount} ${prod.molecule}`
    ).join(', ');
    
    const infoText = `${process.name}\n\n${process.description}\n\nRequires: ${reqText}\nProduces: ${prodText}\nEnergy Cost: ${process.energyCost}`;
    
    this.processInfoText.setText(infoText);
    this.processInfoText.setColor('#ffffff');
  }

  private createStatusDisplay(): void {
    const { height } = this.scale;
    
    this.statusPanel = this.add.container(0, 0);
    
    // Status panel at the bottom, much larger
    const statusBg = this.add.graphics();
    statusBg.fillStyle(0x2c3e50, 0.9);
    statusBg.fillRoundedRect(20, height - 200, 600, 180, 10); // Bottom of screen, much larger
    
    this.statusPanel.add(statusBg);
    
    this.updateStatusDisplay();
  }

  private createHealthMonitor(): void {
    const { width, height } = this.scale;
    
    this.healthMonitor = this.add.container(0, 0);
    
    // Health monitor at bottom right, very compact
    const healthBg = this.add.graphics();
    healthBg.fillStyle(0x34495e, 0.95);
    healthBg.fillRoundedRect(width - 300, height - 120, 280, 100, 10); // Much smaller panel
    
    const titleText = this.add.text(width - 290, height - 110, 'Health Monitor', {
      fontSize: '14px', // Smaller title
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    this.healthMonitor.add([healthBg, titleText]);
    
    this.updateHealthMonitor();
  }

  private createTimeControls(): void {
    const { width } = this.scale;
    
    this.timeControlPanel = this.add.container(0, 0);
    
    // Time control panel moved 200px more to the right and 10px down
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x34495e, 0.95);
    panelBg.fillRoundedRect(width / 2 + 250, 20, 300, 50, 10); // Moved down 10px: was 10, now 20
    
    // Title
    const titleText = this.add.text(width / 2 + 260, 30, 'Time Control:', { // Moved down 10px: was 20, now 30
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    // Speed display
    this.speedDisplay = this.add.text(width / 2 + 340, 30, 'Speed: 1.0x', { // Moved down 10px: was 20, now 30
      fontSize: '12px',
      color: '#3498db',
      fontStyle: 'bold'
    });
    
    // Control buttons - horizontal layout
    const buttonY = 45; // Moved down 10px: was 35, now 45
    const buttonSpacing = 35;
    const startX = width / 2 + 320;
    
    // Pause button
    const pauseButton = this.createTimeControlButton(startX, buttonY, '⏸');
    pauseButton.on('pointerdown', () => this.setGameSpeed(0));
    
    // 0.5x speed button  
    const slowButton = this.createTimeControlButton(startX + buttonSpacing, buttonY, '½');
    slowButton.on('pointerdown', () => this.setGameSpeed(0.5));
    
    // 1x speed button (normal)
    const normalButton = this.createTimeControlButton(startX + buttonSpacing * 2, buttonY, '1');
    normalButton.on('pointerdown', () => this.setGameSpeed(1.0));
    
    // 2x speed button
    const fastButton = this.createTimeControlButton(startX + buttonSpacing * 3, buttonY, '2');
    fastButton.on('pointerdown', () => this.setGameSpeed(2.0));
    
    // 5x speed button
    const veryFastButton = this.createTimeControlButton(startX + buttonSpacing * 4, buttonY, '5');
    veryFastButton.on('pointerdown', () => this.setGameSpeed(5.0));
    
    this.timeControlPanel.add([panelBg, titleText, this.speedDisplay, pauseButton, slowButton, normalButton, fastButton, veryFastButton]);
    
    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.setGameSpeed(this.gameSpeed === 0 ? 1.0 : 0); // Toggle pause
    });
    
    this.input.keyboard?.on('keydown-ONE', () => this.setGameSpeed(1.0));
    this.input.keyboard?.on('keydown-TWO', () => this.setGameSpeed(2.0));
    this.input.keyboard?.on('keydown-THREE', () => this.setGameSpeed(0.5));
    this.input.keyboard?.on('keydown-FOUR', () => this.setGameSpeed(5.0));
    
    // Help text - moved to align with new time controls position
    const helpText = this.add.text(width / 2 + 400, 70, 'Keys: SPACE=Pause, 1=Normal, 2=Fast, 3=Slow, 4=Very Fast', {
      fontSize: '10px',
      color: '#95a5a6',
      fontStyle: 'italic'
    }).setOrigin(0.5);
  }

  private createTimeControlButton(x: number, y: number, symbol: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x3498db, 0.8);
    bg.fillRoundedRect(-12, -8, 24, 16, 3); // Smaller buttons
    bg.lineStyle(1, 0xffffff, 0.8);
    bg.strokeRoundedRect(-12, -8, 24, 16, 3);
    
    const text = this.add.text(0, 0, symbol, {
      fontSize: '12px', // Smaller text
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    container.add([bg, text]);
    container.setSize(24, 16); // Smaller hit area
    container.setInteractive();
    
    // Simple hover effects without tooltips
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2980b9, 0.9);
      bg.fillRoundedRect(-12, -8, 24, 16, 3);
      bg.lineStyle(2, 0xffffff, 1);
      bg.strokeRoundedRect(-12, -8, 24, 16, 3);
    });
    
    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x3498db, 0.8);
      bg.fillRoundedRect(-12, -8, 24, 16, 3);
      bg.lineStyle(1, 0xffffff, 0.8);
      bg.strokeRoundedRect(-12, -8, 24, 16, 3);
    });
    
    return container;
  }

  private setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
    this.isPaused = speed === 0;
    
    // Update display
    if (this.speedDisplay) {
      if (speed === 0) {
        this.speedDisplay.setText('Speed: PAUSED');
        this.speedDisplay.setColor('#e74c3c');
      } else {
        this.speedDisplay.setText(`Speed: ${speed}x`);
        this.speedDisplay.setColor(speed === 1.0 ? '#3498db' : speed < 1.0 ? '#f39c12' : '#2ecc71');
      }
    }
    
    // Log speed change
    console.log(`⏱️ Game speed changed to: ${speed === 0 ? 'PAUSED' : speed + 'x'}`);
    
    // Show notification
    if (speed === 0) {
      this.showAlert('Game PAUSED - Press SPACE or ⏸ to resume', 'info');
    } else if (speed !== 1.0) {
      this.showAlert(`Game speed: ${speed}x`, 'info');
    }
  }

  private updateHealthMonitor(): void {
    if (!this.healthMonitor) return;
    
    const { width, height } = this.scale;
    
    // Clear previous displays (keep background and title)
    const children = this.healthMonitor.list.slice();
    children.slice(2).forEach(child => child.destroy()); // Keep first 2 (bg + title)
    
    // Display critical molecular warnings
    const criticalMolecules = [];
    
    // Check for critical waste levels
    const waste = this.moleculeStocks.waste || 0;
    if (waste >= 150) {
      criticalMolecules.push({ name: 'Waste', level: waste, critical: 200, color: '#e74c3c' });
    }
    
    // Check for critical CO2 levels  
    const co2 = this.moleculeStocks.co2 || 0;
    if (co2 >= 90) {
      criticalMolecules.push({ name: 'CO₂', level: co2, critical: 120, color: '#e74c3c' });
    }
    
    // Check for critically low ATP
    const atp = this.moleculeStocks.atp || 0;
    if (atp <= 10) {
      criticalMolecules.push({ name: 'ATP', level: atp, critical: 5, color: '#f39c12' });
    }
    
    // Check for critically low energy
    if (this.energyLevel <= 20) {
      criticalMolecules.push({ name: 'Energy', level: this.energyLevel, critical: 0, color: '#f39c12' });
    }
    
    // Display critical warnings
    criticalMolecules.slice(0, 3).forEach((mol, index) => {
      const y = height - 95 + index * 15;
      const warningText = this.add.text(width - 290, y,
        `⚠️ ${mol.name}: ${Math.round(mol.level)}`, {
        fontSize: '12px',
        color: mol.color,
        fontStyle: 'bold'
      });
      
      this.healthMonitor.add([warningText]);
    });
    
    // If no critical warnings, show "All systems stable"
    if (criticalMolecules.length === 0) {
      const stableText = this.add.text(width - 290, height - 95, '✅ All systems stable', {
        fontSize: '12px',
        color: '#2ecc71',
        fontStyle: 'bold'
      });
      this.healthMonitor.add([stableText]);
    }
    
    // Show one active goal at the very bottom
    const activeGoals = this.goals.filter(g => !g.completed).slice(0, 1);
    activeGoals.forEach((goal, index) => {
      const goalY = height - 35;
      const progress = Math.min(100, (goal.current / goal.target) * 100);
      
      const goalText = this.add.text(width - 440, goalY, 
        `${goal.name}: ${progress.toFixed(0)}%`, {
        fontSize: '16px',
        color: progress >= 100 ? '#2ecc71' : '#f39c12',
        fontStyle: 'bold'
      });
      
      this.healthMonitor.add(goalText);
    });
    
    // Show total health change
    if (this.healthFactors.length > 0) {
      const totalChange = this.healthFactors.reduce((sum, f) => sum + f.impact, 0);
      const totalColor = totalChange > 0 ? '#2ecc71' : totalChange < 0 ? '#e74c3c' : '#f39c12';
      const sign = totalChange > 0 ? '+' : '';
      
      const totalText = this.add.text(width - 280, height - 40, // Bottom of panel
        `Total Change: ${sign}${totalChange.toFixed(1)}/sec`, {
        fontSize: '18px', // Much larger: increased from 12px
        color: totalColor,
        fontStyle: 'bold',
        backgroundColor: '#2c3e50',
        padding: { x: 8, y: 4 } // More padding
      });
      
      this.healthMonitor.add(totalText);
    }
  }

  private createAlertPanel(): void {
    this.alertPanel = this.add.container(0, 0);
    
    // Initially hidden
    this.alertPanel.setVisible(false);
  }

  private notifications: Phaser.GameObjects.Container[] = [];
  private maxNotifications: number = 3; // Limit to 3 notifications max

  private showAlert(message: string, type: 'warning' | 'danger' | 'info' = 'info'): void {
    // Only show important notifications - filter out spam
    if (this.shouldShowNotification(message, type)) {
      this.createNotification(message, type);
    }
  }

  private shouldShowNotification(message: string, type: 'warning' | 'danger' | 'info'): boolean {
    // Track recent notifications to prevent spam
    const now = Date.now();
    const cooldownTime = 5000; // 5 seconds cooldown for same message
    
    // Check if this exact message was shown recently
    if (this.recentNotifications.has(message)) {
      const lastShown = this.recentNotifications.get(message);
      if (now - lastShown! < cooldownTime) {
        return false; // Still in cooldown
      }
    }
    
    // Always show objective completions and major achievements
    if (message.includes('Objective Complete') || 
        message.includes('Specialization') || 
        message.includes('Research Unlocked') ||
        message.includes('development complete')) {
      this.recentNotifications.set(message, now);
      return true;
    }
    
    // For crisis messages, use longer cooldown and check if condition is still true
    if (type === 'danger') {
      const longerCooldown = 10000; // 10 seconds for crisis messages
      if (this.recentNotifications.has(message)) {
        const lastShown = this.recentNotifications.get(message);
        if (now - lastShown! < longerCooldown) {
          return false;
        }
      }
      
      // Only show crisis if the condition is actually critical
      if (message.includes('Oxygen Crisis') && (this.moleculeStocks.oxygen || 0) > 10) {
        return false; // Oxygen not critically low anymore
      }
      if (message.includes('Glucose Shortage') && (this.moleculeStocks.glucose || 0) > 15) {
        return false; // Glucose not critically low anymore
      }
      if (message.includes('Toxic Emergency') && (this.moleculeStocks.waste || 0) < 30) {
        return false; // Waste not critically high anymore
      }
      
      this.recentNotifications.set(message, now);
      return true;
    }
    
    // Filter out spammy process notifications
    const spamKeywords = [
      'activated', 'deactivated', 'stopped', 'shutting off', 
      'auto-shutoff', 'insufficient resources', 'duration'
    ];
    
    if (spamKeywords.some(keyword => message.includes(keyword))) {
      return false;
    }
    
    // Show other notifications with cooldown
    this.recentNotifications.set(message, now);
    return true;
  }

  private createNotification(message: string, type: 'warning' | 'danger' | 'info' = 'info'): void {
    // Remove oldest notification if at limit
    if (this.notifications.length >= this.maxNotifications) {
      const oldest = this.notifications.shift();
      if (oldest) {
        oldest.destroy();
      }
    }

    const colors = {
      warning: 0xf39c12,
      danger: 0xe74c3c,
      info: 0x3498db
    };

    // Create notification container
    const notification = this.add.container();
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(colors[type], 0.95);
    bg.fillRoundedRect(0, 0, 280, 45, 8);
    bg.lineStyle(2, colors[type], 0.8);
    bg.strokeRoundedRect(0, 0, 280, 45, 8);
    
    // Text
    const text = this.add.text(140, 22, message, {
      fontSize: '11px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 260 }
    });
    text.setOrigin(0.5);
    
    // Add to container
    notification.add([bg, text]);
    
    // Position notification (between cell vitals and health monitor)
    const { height } = this.scale;
    const notificationX = 650; // Between vitals (width ~620) and health monitor (starts ~width-300)
    const notificationY = height - 200 + (this.notifications.length * 55); // Start at vitals level, stack upward
    notification.setPosition(notificationX, notificationY);
    
    // Add to notifications array
    this.notifications.push(notification);
    
    // Slide in animation
    notification.setAlpha(0);
    notification.x -= 30;
    this.tweens.add({
      targets: notification,
      alpha: 1,
      x: notificationX,
      duration: 300,
      ease: 'Power2'
    });
    
    // Auto-remove after 4 seconds (slightly longer for reading)
    this.time.delayedCall(4000, () => {
      this.removeNotification(notification);
    });
  }

  private removeNotification(notification: Phaser.GameObjects.Container): void {
    const index = this.notifications.indexOf(notification);
    if (index === -1) return;
    
    // Slide out animation
    this.tweens.add({
      targets: notification,
      alpha: 0,
      x: notification.x - 30,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        notification.destroy();
        this.notifications.splice(index, 1);
        
        // Re-position remaining notifications (bottom-up stacking)
        const { height } = this.scale;
        this.notifications.forEach((notif, i) => {
          const newY = height - 200 + (i * 55); // Start at vitals level
          this.tweens.add({
            targets: notif,
            y: newY,
            duration: 200,
            ease: 'Power2'
          });
        });
      }
    });
  }

  private showTutorialMessage(): void {
    // Tutorial disabled to reduce notification spam
    // Players can learn through objectives and visual feedback
  }

  private toggleProcess(process: CellularProcess): void {
    if (process.active) {
      process.active = false;
      process.timeRemaining = 0;
      this.showAlert(`${process.name} deactivated`, 'info');
    } else {
      // Check for conflicts before activation
      const conflicts = process.conflictsWith.filter(conflictId => 
        this.cellularProcesses.find(p => p.id === conflictId && p.active)
      );
      
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map(id => 
          this.cellularProcesses.find(p => p.id === id)?.name
        ).filter(Boolean).join(', ');
        this.showAlert(`Cannot activate ${process.name} - conflicts with: ${conflictNames}`, 'warning');
        return;
      }

      if (this.canRunProcess(process)) {
        process.active = true;
        process.timeRemaining = process.duration;
        this.showAlert(`${process.name} activated (${process.duration}s duration)`, 'info');
      } else {
        this.showAlert(`Cannot activate ${process.name} - insufficient resources!`, 'warning');
      }
    }
    
    // Update button visuals immediately after toggling
    this.updateAllProcessButtonVisuals();
  }

  private canRunProcess(process: CellularProcess): boolean {
    return process.requirements.every(req => 
      (this.moleculeStocks[req.molecule] || 0) >= req.amount
    );
  }

  private startGameLoop(): void {
    // Main game tick
    this.time.addEvent({
      delay: 1000, // Every second
      callback: this.gameUpdate,
      callbackScope: this,
      repeat: -1
    });
    
    // Visual updates (faster for smooth animations)
    this.time.addEvent({
      delay: 100, // Every 100ms for smooth animation
      callback: this.updateVisuals,
      callbackScope: this,
      repeat: -1
    });
    
    // Resource consumption/events
    this.time.addEvent({
      delay: 3000, // Every 3 seconds
      callback: this.resourceUpdate,
      callbackScope: this,
      repeat: -1
    });
    
    // Random events
    this.time.addEvent({
      delay: 15000, // Every 15 seconds
      callback: this.checkRandomEvents,
      callbackScope: this,
      repeat: -1
    });
  }

  private updateVisuals(): void {
    // Update process button animations
    this.cellularProcesses.forEach(process => {
      const container = this.processButtons.get(process.id);
      if (container && process.active) {
        const bg = container.list[0] as Phaser.GameObjects.Graphics;
        this.updateProcessButtonVisual(bg, process);
      }
    });
    
    // Update pathway visualizations
    this.updatePathwayVisualization();
    
    // Update status display for live molecule deltas (but less frequently)
    // Only update UI every 500ms to avoid constant recreation
    if (!this.lastUIUpdate || Date.now() - this.lastUIUpdate > 500) {
      this.updateStatusDisplay();
      this.lastUIUpdate = Date.now();
    }
  }

  private updatePathwayVisualization(): void {
    if (!this.cellVisuals?.pathwayIndicators) return;
    
    const pathways = this.cellVisuals.pathwayIndicators;
    
    // Show/hide pathway indicators based on active processes
    pathways.glycolysis.setVisible(this.isProcessActive('glycolysis'));
    pathways.respiration.setVisible(this.isProcessActive('respiration'));
    pathways.protein_synthesis.setVisible(this.isProcessActive('protein_synthesis'));
    pathways.lipid_synthesis.setVisible(this.isProcessActive('lipid_synthesis'));
    pathways.waste_removal.setVisible(this.isProcessActive('waste_removal'));
    pathways.nucleotide_synthesis.setVisible(this.isProcessActive('nucleotide_synthesis'));
    pathways.dna_synthesis.setVisible(this.isProcessActive('dna_synthesis'));
    
    // Add pulsing animation to active pathways
    Object.entries(pathways).forEach(([processId, indicator]) => {
      if (indicator.visible) {
        // Create pulsing effect
        if (!indicator.getData('isPulsing')) {
          indicator.setData('isPulsing', true);
          this.tweens.add({
            targets: indicator,
            alpha: 0.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      } else {
        // Stop pulsing when inactive
        indicator.setData('isPulsing', false);
        this.tweens.killTweensOf(indicator);
        indicator.setAlpha(1);
      }
    });
  }

  private gameUpdate(): void {
    // Check if game is paused
    if (this.isPaused || this.gameSpeed === 0) {
      return; // Skip all game updates when paused
    }
    
    // Apply game speed multiplier to time progression
    const speedMultiplier = this.gameSpeed;
    
    // Store previous molecule stocks for delta calculation before any changes
    this.previousMoleculeStocks = { ...this.moleculeStocks };
    
    this.timeOfDay += 0.5 * speedMultiplier; // 30 minutes per second, adjusted for speed
    if (this.timeOfDay >= 24) {
      this.timeOfDay = 0;
      this.day++;
      this.difficulty += 0.1;
      
      // Trigger daily challenges
      this.triggerDailyChallenge();
    }
    
    // Random events every 30-60 seconds (adjusted for speed)
    if (Math.random() < 0.02 * speedMultiplier) { // 2% chance per update, scaled by speed
      this.triggerRandomEvent();
    }
    
    // Environmental conditions based on time of day
    this.applyEnvironmentalEffects();
    
    // AGGRESSIVE BASELINE METABOLISM - Cell has essential needs that can't be turned off
    // Apply speed multiplier to all metabolic processes
    this.energyLevel = Math.max(0, this.energyLevel - 3.0 * speedMultiplier); // Higher baseline energy drain
    this.moleculeStocks.oxygen = Math.max(0, (this.moleculeStocks.oxygen || 0) - 1.5 * speedMultiplier); // Higher oxygen consumption
    this.moleculeStocks.glucose = Math.max(0, (this.moleculeStocks.glucose || 0) - 1.0 * speedMultiplier); // Higher glucose consumption
    this.moleculeStocks.water = Math.max(0, (this.moleculeStocks.water || 0) - 0.5 * speedMultiplier); // Higher water consumption
    this.moleculeStocks.atp = Math.max(0, (this.moleculeStocks.atp || 0) - 2.0 * speedMultiplier); // Higher ATP consumption for maintenance
    this.moleculeStocks.waste = (this.moleculeStocks.waste || 0) + 1.5 * speedMultiplier; // More aggressive waste production
    this.moleculeStocks.co2 = (this.moleculeStocks.co2 || 0) + 0.8 * speedMultiplier; // Higher CO2 production
    
    // PASSIVE CO2 DIFFUSION - CO2 naturally diffuses out of cells
    const currentCO2 = this.moleculeStocks.co2 || 0;
    const diffusionRate = Math.min(currentCO2 * 0.4 * speedMultiplier, 8 * speedMultiplier); // Apply speed to diffusion
    this.moleculeStocks.co2 = Math.max(0, currentCO2 - diffusionRate);
    
    // RESOURCE SCARCITY - Make resources harder to maintain
    this.applyPositiveBenefits();
    this.applyDynamicChallenges();
    
    // ATP to Energy conversion - ATP regenerates energy!
    if (this.moleculeStocks.atp > 0) {
      const energyFromATP = Math.min(10, this.moleculeStocks.atp * 0.1); // Much better conversion rate
      this.energyLevel = Math.min(100, this.energyLevel + energyFromATP);
      this.moleculeStocks.atp = Math.max(0, this.moleculeStocks.atp - energyFromATP * 0.5); // Less ATP consumed per energy
    }
    
    // Process active cellular processes
    this.cellularProcesses.forEach(process => {
      if (process.active && this.canRunProcess(process)) {
        // Countdown timer - processes auto-shutoff
        process.timeRemaining -= 1;
        
        // Warning when process is about to shut off
        if (process.timeRemaining === 10) {
          this.showAlert(`${process.name} shutting off in 10 seconds!`, 'warning');
        }
        
        // Auto-shutoff when timer expires
        if (process.timeRemaining <= 0) {
          process.active = false;
          process.timeRemaining = 0;
          this.showAlert(`${process.name} auto-shutoff! Reactivate to continue.`, 'warning');
          return; // Don't run the process this cycle
        }

        // Run the process
        this.runProcess(process);
      } else if (process.active && !this.canRunProcess(process)) {
        // Process cannot continue due to lack of resources
        process.active = false;
        process.timeRemaining = 0;
        this.showAlert(`${process.name} stopped - insufficient resources!`, 'warning');
      }
    });
    
    // Update objectives and progression
    this.checkObjectiveProgress();
    this.updateObjectiveDisplay();
    
    // Update displays
    this.updateStockDisplays();
    this.updateStatusDisplay();
    this.updateAllProcessButtonVisuals();
    
    // Check win/lose conditions
    this.checkGameState();
    
    // Check for research unlocks
    this.checkResearchUnlocks();
  }

  private applyPositiveBenefits(): void {
    // Proteins provide efficiency boosts and unlock new capabilities
    const proteinLevel = this.moleculeStocks.proteins || 0;
    if (proteinLevel >= 10) {
      // High protein levels boost ALL process efficiency
      this.cellularProcesses.forEach(process => {
        if (process.active) {
          process.efficiency = Math.min(1.5, process.efficiency + 0.05); // Up to 50% efficiency boost
        }
      });
      
      // Protein synthesis enzymes boost energy production
      if (proteinLevel >= 20) {
        this.moleculeStocks.atp = Math.min(1000, (this.moleculeStocks.atp || 0) + 2);
        this.showAlert('Protein Boost: Enhanced cellular machinery increases ATP production!', 'info');
      }
    }
    
    // Lipids enable membrane expansion and better resource storage
    const lipidLevel = this.moleculeStocks.lipids || 0;
    if (lipidLevel >= 8) {
      // Better membrane = less resource leakage
      this.moleculeStocks.glucose = Math.min(1000, (this.moleculeStocks.glucose || 0) + 0.5);
      this.moleculeStocks.oxygen = Math.min(1000, (this.moleculeStocks.oxygen || 0) + 0.3);
      
      if (lipidLevel >= 15) {
        this.showAlert('Membrane Excellence: Enhanced lipid bilayer improves all transport!', 'info');
      }
    }
    
    // Membrane repair provides cellular resilience and growth
    const organelles = this.moleculeStocks.organelles || 0;
    if (organelles >= 5) {
      // Well-maintained organelles boost multiple processes
      const membraneBoost = Math.floor(organelles / 3);
      
      // Mitochondria boost energy production
      this.moleculeStocks.atp = Math.min(1000, (this.moleculeStocks.atp || 0) + membraneBoost);
      
      // ER and Golgi boost protein/lipid synthesis efficiency
      const proteinProcess = this.cellularProcesses.find(p => p.id === 'protein_synthesis');
      const lipidProcess = this.cellularProcesses.find(p => p.id === 'lipid_synthesis');
      
      if (proteinProcess) proteinProcess.efficiency = Math.min(1.3, proteinProcess.efficiency + 0.03);
      if (lipidProcess) lipidProcess.efficiency = Math.min(1.3, lipidProcess.efficiency + 0.03);
      
      if (organelles >= 10) {
        this.showAlert('Organelle Network: Advanced cellular architecture unlocks new capabilities!', 'info');
      }
    }
    
    // Environmental adaptation - reduced frequency to prevent spam
    if (Math.random() < 0.01) { // Reduced from 5% to 1% chance per update
      const beneficialEvents = [
        () => {
          this.moleculeStocks.glucose = Math.min(1000, (this.moleculeStocks.glucose || 0) + 8);
          // Removed notification - visual feedback in molecule counter is sufficient
        },
        () => {
          this.moleculeStocks.oxygen = Math.min(1000, (this.moleculeStocks.oxygen || 0) + 12);
          // Removed notification - visual feedback in molecule counter is sufficient
        },
        () => {
          if (proteinLevel >= 5) {
            this.moleculeStocks.enzymes = Math.min(100, (this.moleculeStocks.enzymes || 0) + 3);
            // Removed notification - visual feedback in molecule counter is sufficient
          }
        }
      ];
      
      const randomEvent = beneficialEvents[Math.floor(Math.random() * beneficialEvents.length)];
      randomEvent();
    }
  }

  private isProcessActive(processId: string): boolean {
    const process = this.cellularProcesses.find(p => p.id === processId);
    return process ? process.active : false;
  }

  private applyDynamicChallenges(): void {
    // Time-based challenges that force strategy changes
    const currentHour = Math.floor(this.timeOfDay);
    
    // Day/Night cycle challenges - effects only, no spam notifications
    if (currentHour >= 6 && currentHour < 18) {
      // Daytime: High energy demands
      if (Math.random() < 0.08) {
        this.moleculeStocks.atp = Math.max(0, (this.moleculeStocks.atp || 0) - 8);
        // Removed notification - players can see ATP dropping in UI
      }
    } else {
      // Nighttime: Reduced glucose uptake
      if (Math.random() < 0.06) {
        this.moleculeStocks.glucose = Math.max(0, (this.moleculeStocks.glucose || 0) - 5);
        // Removed notification - players can see glucose dropping in UI
      }
    }
    
    // Weekly challenges based on day
    if (this.day % 3 === 0) {
      // Every 3rd day: Resource crisis - forces process switching
      if (Math.random() < 0.12) {
        const crisisTypes = [
          () => {
            // Oxygen crisis - must prioritize oxygen transport
            this.moleculeStocks.oxygen = Math.max(0, (this.moleculeStocks.oxygen || 0) - 12);
            this.showAlert('Oxygen Crisis! Switch to Oxygen Transport immediately!', 'danger');
          },
          () => {
            // Glucose shortage - must use lipid metabolism
            this.moleculeStocks.glucose = Math.max(0, (this.moleculeStocks.glucose || 0) - 15);
            this.showAlert('Glucose Shortage! Consider alternative energy pathways!', 'danger');
          },
          () => {
            // Toxic buildup - must run waste removal
            this.moleculeStocks.waste += 20;
            this.showAlert('Toxic Emergency! Run Waste Removal now!', 'danger');
          }
        ];
        
        const crisis = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];
        crisis();
      }
    }
    
    // Process inefficiency buildup - forces manual reactivation
    if (Math.random() < 0.04) {
      const activeProcesses = this.cellularProcesses.filter(p => p.active);
      if (activeProcesses.length > 0) {
        const randomProcess = activeProcesses[Math.floor(Math.random() * activeProcesses.length)];
        randomProcess.efficiency = Math.max(0.4, randomProcess.efficiency - 0.15);
        this.showAlert(`${randomProcess.name} efficiency degraded! Reactivate to restore performance.`, 'warning');
      }
    }
    
    // Advanced challenge: Process conflicts force strategic choices
    if (this.isProcessActive('cellular_respiration') && this.isProcessActive('lipid_synthesis') && this.isProcessActive('protein_synthesis')) {
      // Running too many energy-intensive processes
      if (Math.random() < 0.1) {
        this.moleculeStocks.atp = Math.max(0, (this.moleculeStocks.atp || 0) - 15);
        this.showAlert('Energy Overload! Too many ATP-demanding processes active!', 'danger');
      }
    }
  }

  private getProcessDuration(processId: string): number {
    // Different processes have different durations before auto-shutoff
    const durations: Record<string, number> = {
      'glycolysis': 90, // Fast energy, short duration
      'respiration': 150, // Efficient but needs monitoring
      'amino_acid_synthesis': 100,
      'protein_synthesis': 80, // Complex, requires frequent reactivation
      'waste_removal': 60, // Must be run frequently
      'oxygen_transport': 120,
      'glucose_uptake': 130,
      'nucleotide_uptake': 120,
      'dna_synthesis': 90,
      'lipid_synthesis': 70, // Resource intensive
      'membrane_repair': 50, // Critical maintenance
      'fatty_acid_synthesis': 85,
      'nucleotide_synthesis': 75,
      'rna_synthesis': 65,
      'dna_replication': 40,
      'cell_division': 30
    };
    return durations[processId] || 100;
  }

  private getProcessConflicts(processId: string): string[] {
    // Define which processes cannot run simultaneously
    const conflicts: Record<string, string[]> = {
      'respiration': ['fermentation'], // Aerobic respiration conflicts with anaerobic fermentation
      'fermentation': ['respiration'], // Anaerobic fermentation conflicts with aerobic respiration
      'protein_synthesis': ['lipid_synthesis'], // Compete for resources
      'lipid_synthesis': ['protein_synthesis'],
      'membrane_repair': ['waste_removal'], // Both are maintenance operations
      'waste_removal': ['membrane_repair'],
      'dna_replication': ['rna_synthesis'], // Cannot replicate and transcribe simultaneously
      'rna_synthesis': ['dna_replication'],
      'cell_division': ['glycolysis', 'respiration', 'protein_synthesis'] // Division requires full cellular focus
    };
    return conflicts[processId] || [];
  }

  private initializeObjectives(): void {
    this.currentObjectives = [
      {
        id: 'basic_survival',
        name: 'Establish Basic Life Functions',
        description: 'Build fundamental cellular machinery to sustain life',
        purpose: 'Every living cell needs energy production and waste management to survive',
        requirements: [
          { molecule: 'atp', amount: 100 },
          { molecule: 'proteins', amount: 5 }
        ],
        rewards: ['Unlocks Growth Phase', 'Access to specialization research'],
        unlocks: ['muscle_research', 'nerve_research', 'immune_research'],
        category: 'survival',
        completed: false,
        progress: 0
      },
      {
        id: 'choose_specialization',
        name: 'Choose Your Cellular Destiny',
        description: 'Decide what type of specialized cell you want to become',
        purpose: 'Specialization allows you to excel in specific functions and unlock unique abilities',
        requirements: [
          { molecule: 'proteins', amount: 20 },
          { molecule: 'lipids', amount: 15 }
        ],
        rewards: ['Choose: Muscle, Nerve, or Immune specialization'],
        unlocks: ['specialized_processes'],
        category: 'specialization',
        completed: false,
        progress: 0
      }
    ];
  }

  private initializeResearchPaths(): void {
    this.researchPaths = [
      {
        id: 'muscle_research',
        name: 'Muscle Cell Development',
        description: 'Develop into a powerful muscle cell capable of contraction',
        vision: 'Become the driving force behind movement - generate powerful contractions to move the organism',
        stages: [
          {
            name: 'Actin Foundation',
            requirements: [{ molecule: 'proteins', amount: 15 }],
            benefit: 'Unlocks basic contractile proteins',
            completed: false
          },
          {
            name: 'Myosin Machinery',
            requirements: [{ molecule: 'proteins', amount: 30 }, { molecule: 'atp', amount: 200 }],
            benefit: 'Enables powerful muscle contractions',
            completed: false
          },
          {
            name: 'Calcium Control',
            requirements: [{ molecule: 'organelles', amount: 10 }],
            benefit: 'Precise contraction control - you can now move the organism!',
            completed: false
          }
        ],
        currentStage: 0
      },
      {
        id: 'nerve_research',
        name: 'Nerve Cell Development',
        description: 'Develop into a nerve cell capable of rapid communication',
        vision: 'Become the communication network - transmit signals that coordinate the entire organism',
        stages: [
          {
            name: 'Membrane Specialization',
            requirements: [{ molecule: 'lipids', amount: 25 }],
            benefit: 'Creates specialized ion channels',
            completed: false
          },
          {
            name: 'Axon Extension',
            requirements: [{ molecule: 'proteins', amount: 40 }],
            benefit: 'Grows long projections for signal transmission',
            completed: false
          },
          {
            name: 'Synaptic Networks',
            requirements: [{ molecule: 'organelles', amount: 15 }],
            benefit: 'Connect with other cells - you can now control the organism!',
            completed: false
          }
        ],
        currentStage: 0
      }
    ];
  }

  private createPurposeDisplay(): void {
    const { width, height } = this.scale;
    
    // Purpose banner at the top
    const purposeBg = this.add.graphics();
    purposeBg.fillStyle(0x8e44ad, 0.9);
    purposeBg.fillRoundedRect(width / 2 - 200, 80, 400, 60, 10);
    
    this.add.text(width / 2, 95, 'Cell Purpose:', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, 115, this.cellPurpose, {
      fontSize: '20px',
      color: '#f39c12',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Current objective display
    this.updateObjectiveDisplay();
  }

  private updateObjectiveDisplay(): void {
    const { width } = this.scale;
    
    // Clear previous objective display
    this.children.list.filter(child => 
      child.getData && child.getData('isObjective')
    ).forEach(child => child.destroy());
    
    const currentObjective = this.currentObjectives.find(obj => !obj.completed);
    if (!currentObjective) return;
    
    // Objective panel
    const objBg = this.add.graphics();
    objBg.fillStyle(0x27ae60, 0.9);
    objBg.fillRoundedRect(width / 2 - 250, 150, 500, 120, 10);
    objBg.setData('isObjective', true);
    
    this.add.text(width / 2, 170, currentObjective.name, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setData('isObjective', true);
    
    this.add.text(width / 2, 190, currentObjective.description, {
      fontSize: '14px',
      color: '#ecf0f1',
      wordWrap: { width: 480 }
    }).setOrigin(0.5).setData('isObjective', true);
    
    this.add.text(width / 2, 210, `WHY: ${currentObjective.purpose}`, {
      fontSize: '12px',
      color: '#f39c12',
      wordWrap: { width: 480 },
      fontStyle: 'italic'
    }).setOrigin(0.5).setData('isObjective', true);
    
    // Progress display
    const progressText = currentObjective.requirements.map(req => {
      const current = Math.floor(this.moleculeStocks[req.molecule] || 0);
      const target = req.amount;
      const percentage = Math.min(100, (current / target) * 100);
      return `${req.molecule}: ${current}/${target} (${percentage.toFixed(0)}%)`;
    }).join(' | ');
    
    this.add.text(width / 2, 240, progressText, {
      fontSize: '12px',
      color: '#bdc3c7'
    }).setOrigin(0.5).setData('isObjective', true);
    
    this.add.text(width / 2, 255, `Rewards: ${currentObjective.rewards.join(', ')}`, {
      fontSize: '11px',
      color: '#2ecc71'
    }).setOrigin(0.5).setData('isObjective', true);
  }

  private checkObjectiveProgress(): void {
    this.currentObjectives.forEach(objective => {
      if (objective.completed) return;
      
      // Check if all requirements are met
      const allRequirementsMet = objective.requirements.every(req => {
        const current = this.moleculeStocks[req.molecule] || 0;
        return current >= req.amount;
      });
      
      if (allRequirementsMet && !objective.completed) {
        objective.completed = true;
        this.showAlert(`Objective Complete: ${objective.name}!`, 'info');
        this.handleObjectiveCompletion(objective);
      }
    });
  }

  private handleObjectiveCompletion(objective: CellularObjective): void {
    switch (objective.id) {
      case 'basic_survival':
        this.showAlert('Congratulations! You\'ve established basic life functions. Now choose your specialization path!', 'info');
        this.createSpecializationChoice();
        break;
        
      case 'choose_specialization':
        this.showAlert('Specialization chosen! You can now research advanced cellular capabilities.', 'info');
        break;
        
      case 'muscle_development':
        this.showAlert('Muscle cell development complete! You can now generate powerful contractions. Adding advanced muscle objectives...', 'info');
        this.addAdvancedMuscleObjectives();
        this.updateObjectiveDisplay();
        break;
        
      case 'nerve_development':
        this.showAlert('Nerve cell development complete! You can now transmit electrical signals. Adding neural network objectives...', 'info');
        this.addAdvancedNerveObjectives();
        this.updateObjectiveDisplay();
        break;
        
      case 'immune_development':
        this.showAlert('Immune cell development complete! You can now detect and fight threats. Adding defense objectives...', 'info');
        this.addAdvancedImmuneObjectives();
        this.updateObjectiveDisplay();
        break;
    }
  }

  private createSpecializationChoice(): void {
    const { width, height } = this.scale;
    
    // Choice panel
    const choiceBg = this.add.graphics();
    choiceBg.fillStyle(0x34495e, 0.95);
    choiceBg.fillRoundedRect(width / 2 - 300, height / 2 - 150, 600, 300, 15);
    choiceBg.setData('isSpecChoice', true);
    
    this.add.text(width / 2, height / 2 - 120, 'Choose Your Specialization', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setData('isSpecChoice', true);
    
    // Muscle choice
    const muscleButton = this.add.graphics();
    muscleButton.fillStyle(0xe74c3c, 0.8);
    muscleButton.fillRoundedRect(width / 2 - 280, height / 2 - 80, 160, 100, 10);
    muscleButton.setInteractive(new Phaser.Geom.Rectangle(width / 2 - 280, height / 2 - 80, 160, 100), Phaser.Geom.Rectangle.Contains);
    muscleButton.on('pointerdown', () => this.chooseSpecialization('muscle'));
    muscleButton.setData('isSpecChoice', true);
    
    this.add.text(width / 2 - 200, height / 2 - 60, 'MUSCLE CELL', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setData('isSpecChoice', true);
    
    this.add.text(width / 2 - 200, height / 2 - 40, 'Generate powerful\ncontractions to\nmove the organism', {
      fontSize: '12px',
      color: '#ecf0f1',
      align: 'center'
    }).setOrigin(0.5).setData('isSpecChoice', true);
    
    // Nerve choice
    const nerveButton = this.add.graphics();
    nerveButton.fillStyle(0x3498db, 0.8);
    nerveButton.fillRoundedRect(width / 2 - 80, height / 2 - 80, 160, 100, 10);
    nerveButton.setInteractive(new Phaser.Geom.Rectangle(width / 2 - 80, height / 2 - 80, 160, 100), Phaser.Geom.Rectangle.Contains);
    nerveButton.on('pointerdown', () => this.chooseSpecialization('nerve'));
    nerveButton.setData('isSpecChoice', true);
    
    this.add.text(width / 2, height / 2 - 60, 'NERVE CELL', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setData('isSpecChoice', true);
    
    this.add.text(width / 2, height / 2 - 40, 'Transmit signals\nto coordinate\nthe organism', {
      fontSize: '12px',
      color: '#ecf0f1',
      align: 'center'
    }).setOrigin(0.5).setData('isSpecChoice', true);
    
    // Immune choice
    const immuneButton = this.add.graphics();
    immuneButton.fillStyle(0x27ae60, 0.8);
    immuneButton.fillRoundedRect(width / 2 + 120, height / 2 - 80, 160, 100, 10);
    immuneButton.setInteractive(new Phaser.Geom.Rectangle(width / 2 + 120, height / 2 - 80, 160, 100), Phaser.Geom.Rectangle.Contains);
    immuneButton.on('pointerdown', () => this.chooseSpecialization('immune'));
    immuneButton.setData('isSpecChoice', true);
    
    this.add.text(width / 2 + 200, height / 2 - 60, 'IMMUNE CELL', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setData('isSpecChoice', true);
    
    this.add.text(width / 2 + 200, height / 2 - 40, 'Defend against\nthreats and\nmaintain health', {
      fontSize: '12px',
      color: '#ecf0f1',
      align: 'center'
    }).setOrigin(0.5).setData('isSpecChoice', true);
  }

  private chooseSpecialization(type: 'muscle' | 'nerve' | 'immune'): void {
    // Clear specialization choice UI
    this.children.list.filter(child => 
      child.getData && (child.getData('isChoice') || child.getData('isSpecChoice'))
    ).forEach(child => child.destroy());
    
    // Also clear graphics objects that don't have getData
    this.children.list.filter(child => 
      child instanceof Phaser.GameObjects.Graphics && 
      child.x >= this.scale.width / 2 - 300 && 
      child.x <= this.scale.width / 2 + 300
    ).forEach(child => child.destroy());
    
    // Set new purpose and objectives
    switch (type) {
      case 'muscle':
        this.cellPurpose = 'Developing Muscle Cell';
        this.showAlert('You are now developing into a MUSCLE CELL! Build contractile proteins to enable movement.', 'info');
        break;
      case 'nerve':
        this.cellPurpose = 'Developing Nerve Cell';
        this.showAlert('You are now developing into a NERVE CELL! Create specialized membranes for signal transmission.', 'info');
        break;
      case 'immune':
        this.cellPurpose = 'Developing Immune Cell';
        this.showAlert('You are now developing into an IMMUNE CELL! Develop pathogen recognition and defense systems.', 'info');
        break;
    }
    
    // Add new objectives based on specialization
    this.addSpecializationObjectives(type);
    this.updateCellVisualizationForSpecialization(type);
    this.createPurposeDisplay(); // Refresh the display
  }

  private addSpecializationObjectives(type: 'muscle' | 'nerve' | 'immune'): void {
    // Clear old objectives and add new specialized ones
    this.currentObjectives = [];
    
    switch (type) {
      case 'muscle':
        this.currentObjectives.push({
          id: 'muscle_development',
          name: 'Build Contractile Machinery',
          description: 'Develop the proteins needed for muscle contraction',
          purpose: 'Actin and myosin proteins are essential for generating the force needed to move the organism',
          requirements: [
            { molecule: 'proteins', amount: 50 },
            { molecule: 'organelles', amount: 8 }
          ],
          rewards: ['Unlock contraction ability', 'Become the driving force of movement'],
          unlocks: ['contraction_process'],
          category: 'specialization',
          completed: false,
          progress: 0
        });
        break;
        
      case 'nerve':
        this.currentObjectives.push({
          id: 'nerve_development',
          name: 'Create Signal Transmission System',
          description: 'Build specialized membranes for electrical signal transmission',
          purpose: 'Ion channels and synapses allow rapid communication across long distances in the organism',
          requirements: [
            { molecule: 'lipids', amount: 40 },
            { molecule: 'proteins', amount: 30 }
          ],
          rewards: ['Unlock signal transmission', 'Control organism coordination'],
          unlocks: ['signal_process'],
          category: 'specialization',
          completed: false,
          progress: 0
        });
        break;
        
      case 'immune':
        this.currentObjectives.push({
          id: 'immune_development',
          name: 'Develop Defense Systems',
          description: 'Create antibodies and recognition systems to protect the organism',
          purpose: 'The organism depends on you to identify and neutralize threats to maintain health',
          requirements: [
            { molecule: 'proteins', amount: 40 },
            { molecule: 'dna', amount: 1 }
          ],
          rewards: ['Unlock pathogen detection', 'Become the guardian of health'],
          unlocks: ['defense_process'],
          category: 'specialization',
          completed: false,
          progress: 0
        });
        break;
    }
  }

  private updateCellVisualizationForSpecialization(type: 'muscle' | 'nerve' | 'immune'): void {
    if (!this.cellVisuals) return;

    // Update cell colors and appearance based on specialization
    switch (type) {
      case 'muscle':
        // Reddish for muscle cells (rich in mitochondria)
        this.cellVisuals.cytoplasm.clear();
        this.cellVisuals.cytoplasm.fillStyle(0x8b1e3f, 0.4); // Deep red
        this.cellVisuals.cytoplasm.fillCircle(this.cellCenter.x, this.cellCenter.y, 78);
        
        // Add more mitochondria for muscle
        const extraMito = this.add.ellipse(this.cellCenter.x + 10, this.cellCenter.y - 25, 16, 8, 0xe74c3c, 0.9);
        this.cellVisuals.mitochondria.push(extraMito);
        break;
        
      case 'nerve':
        // Bluish for nerve cells (specialized membranes)
        this.cellVisuals.cytoplasm.clear();
        this.cellVisuals.cytoplasm.fillStyle(0x1e3a8a, 0.4); // Deep blue
        this.cellVisuals.cytoplasm.fillCircle(this.cellCenter.x, this.cellCenter.y, 78);
        
        // Elongated shape suggestions with extensions
        const extension1 = this.add.ellipse(this.cellCenter.x - 70, this.cellCenter.y + 60, 8, 30, 0x3498db, 0.6);
        const extension2 = this.add.ellipse(this.cellCenter.x + 75, this.cellCenter.y - 45, 8, 25, 0x3498db, 0.6);
        break;
        
      case 'immune':
        // Greenish for immune cells (active defense)
        this.cellVisuals.cytoplasm.clear();
        this.cellVisuals.cytoplasm.fillStyle(0x166534, 0.4); // Deep green
        this.cellVisuals.cytoplasm.fillCircle(this.cellCenter.x, this.cellCenter.y, 78);
        
        // Add receptor-like structures
        const receptor1 = this.add.circle(this.cellCenter.x - 65, this.cellCenter.y - 20, 4, 0x27ae60, 0.8);
        const receptor2 = this.add.circle(this.cellCenter.x + 70, this.cellCenter.y + 15, 4, 0x27ae60, 0.8);
        const receptor3 = this.add.circle(this.cellCenter.x + 20, this.cellCenter.y - 70, 4, 0x27ae60, 0.8);
        break;
    }
  }

  private addAdvancedMuscleObjectives(): void {
    // Add advanced muscle cell objectives
    this.currentObjectives.push({
      id: 'muscle_power',
      name: 'Build Muscle Power Systems',
      description: 'Create calcium storage and high-energy reserves for sustained contractions',
      purpose: 'Calcium triggers contraction while ATP provides the energy - you need both for powerful movement',
      requirements: [
        { molecule: 'proteins', amount: 100 },
        { molecule: 'atp', amount: 50 },
        { molecule: 'organelles', amount: 15 }
      ],
      rewards: ['Unlock powerful contraction bursts', 'Enable organism locomotion'],
      unlocks: ['contraction_burst'],
      category: 'specialization',
      completed: false,
      progress: 0
    });

    this.currentObjectives.push({
      id: 'muscle_endurance',
      name: 'Develop Muscle Endurance',
      description: 'Build efficient energy pathways for sustained movement',
      purpose: 'The organism needs you to work continuously without fatigue - efficiency is survival',
      requirements: [
        { molecule: 'fatty_acids', amount: 20 },
        { molecule: 'organelles', amount: 20 }
      ],
      rewards: ['Unlock sustained contractions', 'Become the tireless engine of movement'],
      unlocks: ['endurance_mode'],
      category: 'specialization',
      completed: false,
      progress: 0
    });
  }

  private addAdvancedNerveObjectives(): void {
    // Add advanced nerve cell objectives
    this.currentObjectives.push({
      id: 'neural_network',
      name: 'Build Neural Network',
      description: 'Create synapses and signal amplification systems',
      purpose: 'Multiple nerve cells must coordinate - your connections enable complex behaviors',
      requirements: [
        { molecule: 'lipids', amount: 80 },
        { molecule: 'proteins', amount: 60 },
        { molecule: 'nucleotides', amount: 15 }
      ],
      rewards: ['Unlock network formation', 'Enable complex neural processing'],
      unlocks: ['synapse_formation'],
      category: 'specialization',
      completed: false,
      progress: 0
    });

    this.currentObjectives.push({
      id: 'signal_speed',
      name: 'Optimize Signal Speed',
      description: 'Develop myelination and fast transmission pathways',
      purpose: 'Survival depends on split-second reactions - your speed saves the organism',
      requirements: [
        { molecule: 'fatty_acids', amount: 30 },
        { molecule: 'cholesterol', amount: 10 }
      ],
      rewards: ['Unlock rapid signal transmission', 'Enable lightning-fast reflexes'],
      unlocks: ['rapid_transmission'],
      category: 'specialization',
      completed: false,
      progress: 0
    });
  }

  private addAdvancedImmuneObjectives(): void {
    // Add advanced immune cell objectives
    this.currentObjectives.push({
      id: 'pathogen_detection',
      name: 'Enhance Pathogen Detection',
      description: 'Build advanced recognition systems and antibody production',
      purpose: 'The organism faces constant threats - you are the early warning system that prevents disease',
      requirements: [
        { molecule: 'proteins', amount: 80 },
        { molecule: 'dna', amount: 2 },
        { molecule: 'rna', amount: 20 }
      ],
      rewards: ['Unlock threat scanning', 'Become the guardian sentinel'],
      unlocks: ['pathogen_scan'],
      category: 'specialization',
      completed: false,
      progress: 0
    });

    this.currentObjectives.push({
      id: 'immune_memory',
      name: 'Develop Immune Memory',
      description: 'Create adaptive responses and long-term pathogen recognition',
      purpose: 'Learning from past threats makes you stronger - your memory protects future generations',
      requirements: [
        { molecule: 'dna', amount: 3 },
        { molecule: 'proteins', amount: 60 }
      ],
      rewards: ['Unlock adaptive immunity', 'Provide lasting protection'],
      unlocks: ['memory_response'],
      category: 'specialization',
      completed: false,
      progress: 0
    });
  }

  private checkResearchUnlocks(): void {
    // Unlock advanced processes based on achievements
    const unlocks = [
      {
        processId: 'fatty_acid_synthesis',
        condition: () => this.moleculeStocks.lipids >= 10,
        message: 'Research Unlocked: Fatty Acid Synthesis! Advanced lipid metabolism available.'
      },
      {
        processId: 'nucleotide_synthesis', 
        condition: () => this.moleculeStocks.proteins >= 2,
        message: 'Research Unlocked: Nucleotide Synthesis! DNA/RNA pathway available.'
      },
      {
        processId: 'dna_synthesis', 
        condition: () => this.moleculeStocks.nucleotides >= 8,
        message: 'Research Unlocked: DNA Synthesis! Genetic storage pathway available.'
      },
      {
        processId: 'rna_synthesis',
        condition: () => this.moleculeStocks.nucleotides >= 12,
        message: 'Research Unlocked: RNA Synthesis! Gene expression pathway available.'
      },
      {
        processId: 'dna_replication',
        condition: () => this.moleculeStocks.rna >= 8,
        message: 'Research Unlocked: DNA Replication! Cell division pathway available.'
      },
      {
        processId: 'enzyme_production',
        condition: () => this.moleculeStocks.proteins >= 8 && this.moleculeStocks.rna >= 5,
        message: 'Research Unlocked: Enzyme Production! Boost process efficiency.'
      },
      {
        processId: 'organelle_biogenesis',
        condition: () => this.moleculeStocks.proteins >= 10 && this.moleculeStocks.lipids >= 15,
        message: 'Research Unlocked: Organelle Biogenesis! Increase cellular capacity.'
      },
      {
        processId: 'cell_division',
        condition: () => this.moleculeStocks.dna >= 1 && this.moleculeStocks.organelles >= 2,
        message: 'MAJOR BREAKTHROUGH: Cell Division Unlocked! Ready to reproduce!'
      }
    ];

    unlocks.forEach(unlock => {
      const process = this.cellularProcesses.find(p => p.id === unlock.processId);
      if (process && !process.unlocked && unlock.condition()) {
        process.unlocked = true;
        this.showAlert(unlock.message, 'info');
        // Recreate process controls to show new unlocked processes
      }
    });
  }

  private runProcess(process: CellularProcess): void {
    // Apply game speed multiplier to process rates
    const speedMultiplier = this.gameSpeed;
    
    // Consume requirements (scaled by speed)
    process.requirements.forEach(req => {
      this.moleculeStocks[req.molecule] = (this.moleculeStocks[req.molecule] || 0) - req.amount * speedMultiplier;
    });
    
    // Produce products with storage limits (scaled by speed)
    process.products.forEach(prod => {
      const currentAmount = this.moleculeStocks[prod.molecule] || 0;
      const capacity = this.moleculeCapacities[prod.molecule] || 1000;
      const produced = prod.amount * process.efficiency * speedMultiplier;
      
      if (currentAmount + produced > capacity) {
        // Storage overflow - waste excess and warn player
        const overflow = (currentAmount + produced) - capacity;
        this.moleculeStocks[prod.molecule] = capacity;
        
        if (Math.random() < 0.3) { // 30% chance to show overflow warning
          this.showAlert(`${prod.molecule} storage full! ${overflow.toFixed(1)} wasted. Manage resources!`, 'warning');
        }
      } else {
        this.moleculeStocks[prod.molecule] = currentAmount + produced;
      }
    });
    
    // Consume energy (scaled by speed)
    this.energyLevel = Math.max(0, this.energyLevel - process.energyCost * speedMultiplier);
    
    // Create visual effects for active processes
    this.createProcessParticles(process);
  }

  private createProcessParticles(process: CellularProcess): void {
    if (!this.cellCenter) return;
    
    // Create different particle effects based on process type
    const colors = {
      'cellular_respiration': 0xf39c12, // Orange for ATP production
      'glucose_uptake': 0x2ecc71,       // Green for glucose
      'oxygen_transport': 0x3498db,     // Blue for oxygen
      'waste_removal': 0x95a5a6,        // Gray for waste
      'protein_synthesis': 0xe74c3c,     // Red for proteins
      'membrane_repair': 0x9b59b6       // Purple for repair
    };
    
    const color = colors[process.id as keyof typeof colors] || 0xffffff;
    
    // Create a simple particle burst at the cell center
    const particles = this.add.particles(this.cellCenter.x, this.cellCenter.y, 'white', {
      speed: { min: 20, max: 50 },
      scale: { start: 0.3, end: 0 },
      lifespan: 800,
      quantity: 3,
      tint: color
    });
    
    // Remove particles after a short time
    this.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  private resourceUpdate(): void {
    // Natural resource consumption - increased for more active gameplay
    this.moleculeStocks.glucose = Math.max(0, this.moleculeStocks.glucose - 1.5);
    this.moleculeStocks.oxygen = Math.max(0, this.moleculeStocks.oxygen - 1.0);
    this.moleculeStocks.atp = Math.max(0, this.moleculeStocks.atp - 2.5);
    
    // Strategic depth: Active processes compete for resources
    const activeProcesses = this.cellularProcesses.filter(p => p.active);
    if (activeProcesses.length > 3) {
      // Resource competition - more active processes = higher individual consumption
      const competitionFactor = activeProcesses.length * 0.3;
      this.moleculeStocks.glucose = Math.max(0, this.moleculeStocks.glucose - competitionFactor);
      this.moleculeStocks.oxygen = Math.max(0, this.moleculeStocks.oxygen - competitionFactor * 0.8);
      this.moleculeStocks.atp = Math.max(0, this.moleculeStocks.atp - competitionFactor * 1.2);
      
      if (Math.random() < 0.15) {
        this.showAlert(`${activeProcesses.length} active processes competing for resources!`, 'warning');
      }
    }
    
    // Process efficiency degradation - prevents set-and-forget
    activeProcesses.forEach(process => {
      // Processes lose efficiency over time without management
      if (process.efficiency > 0.6) {
        process.efficiency = Math.max(0.6, process.efficiency - 0.008); // Slow decay
      }
      
      // Some processes interfere with each other
      if (process.id === 'cellular_respiration' && this.isProcessActive('protein_synthesis')) {
        // Respiration competes with protein synthesis for ATP
        this.moleculeStocks.atp = Math.max(0, (this.moleculeStocks.atp || 0) - 1.5);
      }
      
      if (process.id === 'lipid_synthesis' && this.isProcessActive('amino_acid_synthesis')) {
        // Both use similar metabolic pathways - create bottleneck
        process.efficiency = Math.max(0.7, process.efficiency - 0.05);
      }
    });
    
    // Waste accumulates faster - requires active management
    this.moleculeStocks.waste += 2.5;
    
    // Energy regeneration based on ATP levels (slightly reduced efficiency)
    const energyFromATP = Math.min(4, this.moleculeStocks.atp * 0.15); // Reduced from 5 and 0.2
    this.energyLevel = Math.min(100, this.energyLevel + energyFromATP);
  }

  private updateCellHealth(): void {
    this.healthFactors = []; // Reset health factors for this update
    let healthChange = 0;
    
    // Health is based on ACTUAL molecular conditions, not arbitrary process requirements
    
    // CRITICAL: Energy depletion - cell dies without energy
    if (this.energyLevel <= 5) {
      const impact = -8;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'ENERGY DEPLETION',
        impact: impact,
        description: 'FATAL: Cell has no energy left!'
      });
      
      // Critical warning log
      if (this.energyLevel <= 1) {
        console.warn('🚨 CRITICAL: Energy at fatal levels!', {
          energy: this.energyLevel,
          health: this.cellHealth,
          activeProcesses: this.cellularProcesses.filter(p => p.active).map(p => p.name)
        });
      }
    }
    
    // CRITICAL: Resource starvation - based on actual molecular needs
    if (this.moleculeStocks.glucose < 2) {
      const impact = -4;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'GLUCOSE STARVATION',
        impact: impact,
        description: `Glucose: ${Math.round(this.moleculeStocks.glucose)} - Cell needs glucose for energy!`
      });
      
      // Critical warning log
      if (this.moleculeStocks.glucose < 1) {
        console.warn('🚨 CRITICAL: Glucose starvation!', {
          glucose: this.moleculeStocks.glucose,
          health: this.cellHealth,
          glucoseUptakeActive: this.cellularProcesses.find(p => p.id === 'glucose_uptake')?.active
        });
      }
    }

    if (this.moleculeStocks.oxygen < 3) {
      const impact = -3;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'OXYGEN STARVATION',
        impact: impact,
        description: `Oxygen: ${Math.round(this.moleculeStocks.oxygen)} - Cell needs oxygen for respiration!`
      });
      
      // Critical warning log
      if (this.moleculeStocks.oxygen < 1) {
        console.warn('🚨 CRITICAL: Oxygen starvation!', {
          oxygen: this.moleculeStocks.oxygen,
          health: this.cellHealth,
          oxygenTransportActive: this.cellularProcesses.find(p => p.id === 'oxygen_transport')?.active,
          respirationActive: this.cellularProcesses.find(p => p.id === 'respiration')?.active
        });
      }
    }

    // CRITICAL: Toxic waste accumulation
    if (this.moleculeStocks.waste > 20) {
      const impact = -5;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'TOXIC WASTE',
        impact: impact,
        description: `Waste: ${Math.round(this.moleculeStocks.waste)} - Toxic levels of waste!`
      });
      
      // Critical warning log
      if (this.moleculeStocks.waste > 30) {
        console.warn('🚨 CRITICAL: Toxic waste levels!', {
          waste: this.moleculeStocks.waste,
          health: this.cellHealth,
          wasteRemovalActive: this.cellularProcesses.find(p => p.id === 'waste_removal')?.active
        });
      }
    }

    // Moderate penalties for suboptimal conditions
    if (this.moleculeStocks.atp < 5) {
      const impact = -1;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'Low ATP',
        impact: impact,
        description: `ATP: ${Math.round(this.moleculeStocks.atp)} - Low energy reserves`
      });
    }
    
    if (this.energyLevel < 20) {
      const impact = -1;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'Low Energy',
        impact: impact,
        description: `Energy: ${Math.floor(this.energyLevel)}% - Running low on energy`
      });
    }

    // Positive factors for good molecular conditions
    if (this.moleculeStocks.glucose >= 15) {
      const impact = 0.5;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'Abundant Glucose',
        impact: impact,
        description: `Glucose: ${this.moleculeStocks.glucose} - Good fuel reserves`
      });
    }
    
    if (this.moleculeStocks.atp >= 20) {
      const impact = 0.8;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'High ATP',
        impact: impact,
        description: `ATP: ${this.moleculeStocks.atp} - Excellent energy reserves`
      });
    }
    
    if (this.energyLevel > 70) {
      const impact = 0.5;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'High Energy',
        impact: impact,
        description: `Energy: ${Math.floor(this.energyLevel)}% - Cell is energized`
      });
    }
    
    // Bonus for having multiple active processes (metabolic activity)
    const activeProcesses = this.cellularProcesses.filter(p => p.active).length;
    if (activeProcesses >= 3) {
      const impact = 0.3;
      healthChange += impact;
      this.healthFactors.push({
        factor: 'Active Metabolism',
        impact: impact,
        description: `${activeProcesses} processes active - healthy metabolism`
      });
    }
    
    this.cellHealth = Math.max(0, Math.min(100, this.cellHealth + healthChange));
    
    // Log critical health warnings
    if (this.cellHealth <= 10 && this.cellHealth > 0) {
      console.warn('🚨 CRITICAL: Cell health critically low!', {
        health: this.cellHealth,
        healthChange: healthChange,
        criticalFactors: this.healthFactors.filter(f => f.impact < -2),
        day: this.day,
        energyLevel: this.energyLevel,
        waste: this.moleculeStocks.waste,
        co2: this.moleculeStocks.co2
      });
    }
    
    // Update health monitor display
    this.updateHealthMonitor();
  }

  private checkRandomEvents(): void {
    if (Math.random() < 0.3) { // 30% chance
      const events = [
        {
          name: 'Nutrient Delivery',
          description: 'Fresh nutrients arrived!',
          effects: { glucose: 15, oxygen: 10 },
          type: 'info' as const
        },
        {
          name: 'Oxidative Stress',
          description: 'Free radicals are damaging the cell!',
          effects: { oxygen: -5, waste: 8 },
          type: 'warning' as const
        },
        {
          name: 'Energy Crisis',
          description: 'Cell energy systems are failing!',
          effects: { atp: -10 },
          type: 'danger' as const
        },
        {
          name: 'Membrane Leak',
          description: 'Cell membrane is damaged!',
          effects: { water: -10, glucose: -5 },
          type: 'warning' as const
        }
      ];
      
      const event = events[Math.floor(Math.random() * events.length)];
      
      // Apply effects
      Object.entries(event.effects).forEach(([molecule, change]) => {
        this.moleculeStocks[molecule] = Math.max(0, 
          (this.moleculeStocks[molecule] || 0) + change
        );
      });
      
      this.showAlert(event.description, event.type);
    }
  }

  private checkGameState(): void {
    // Pure molecular death conditions - only based on what player can see and control
    let deathReason = '';
    let shouldDie = false;

    // Check critical molecule levels
    const atp = this.moleculeStocks.atp || 0;
    const glucose = this.moleculeStocks.glucose || 0;
    const oxygen = this.moleculeStocks.oxygen || 0;
    const waste = this.moleculeStocks.waste || 0;
    const co2 = this.moleculeStocks.co2 || 0;
    const energy = this.energyLevel || 0;

    // Death condition 1: Complete energy failure
    if (atp <= 0 && energy <= 0) {
      deathReason = 'Complete Energy Failure';
      shouldDie = true;
    }
    // Death condition 2: Toxic waste overload (based on actual waste molecules)
    else if (waste >= 200 || co2 >= 120) {
      deathReason = 'Toxic Waste Overload';
      shouldDie = true;
    }
    // Death condition 3: Critical resource depletion (multiple essential molecules at zero)
    else if (atp <= 2 && glucose <= 2 && oxygen <= 2) {
      deathReason = 'Critical Resource Depletion';
      shouldDie = true;
    }
    // Death condition 4: Severe energy crisis
    else if (energy <= 5 && atp <= 5) {
      deathReason = 'Severe Energy Crisis';
      shouldDie = true;
    }

    if (shouldDie) {
      // Store the specific death reason for display
      (this as any).deathReason = deathReason;
      this.logDeathDetails();
      this.gameOver();
    } else if (this.day >= 7) {
      // Victory condition: survive 7 days with reasonable conditions
      this.gameWin();
    }
  }

  private logDeathDetails(): void {
    console.log('========================================');
    console.log('🔴 CELL DEATH - DETAILED ANALYSIS');
    console.log('========================================');
    
    // Get the primary cause of death from checkGameState
    const primaryCause = (this as any).deathReason || 'UNKNOWN CAUSE';
    
    console.log(`💀 PRIMARY CAUSE OF DEATH: ${primaryCause}`);
    console.log(`⏰ Time of Death: Day ${this.day}, Hour ${Math.floor(this.timeOfDay)}`);
    console.log(`🧬 Cell Purpose: ${this.cellPurpose}`);
    console.log('');
    
    // Critical stats at time of death
    console.log('📊 CRITICAL MOLECULAR STATS AT DEATH:');
    console.log(`   Energy Level: ${this.energyLevel.toFixed(1)}/100`);
    console.log(`   Cell Size: ${this.cellSize.toFixed(2)}`);
    console.log(`   Reproduction Progress: ${this.reproductionProgress.toFixed(1)}%`);
    console.log(`   Efficiency: ${(this.efficiency * 100).toFixed(1)}%`);
    console.log('');
    
    // Molecule inventory at death
    console.log('🧪 MOLECULE INVENTORY AT DEATH:');
    Object.entries(this.moleculeStocks).forEach(([molecule, amount]) => {
      const capacity = this.moleculeCapacities[molecule] || 1000;
      const percentage = ((amount / capacity) * 100).toFixed(1);
      const critical = this.getMoleculeCriticalLevel(molecule);
      const isCritical = molecule === 'waste' || molecule === 'co2' ? amount > critical : amount < critical;
      const status = isCritical ? '⚠️ CRITICAL' : '✅ OK';
      console.log(`   ${molecule}: ${amount.toFixed(1)}/${capacity} (${percentage}%) ${status}`);
    });
    console.log('');
    
    // Get current molecular levels for death analysis
    const waste = this.moleculeStocks.waste || 0;
    const co2 = this.moleculeStocks.co2 || 0;
    const atp = this.moleculeStocks.atp || 0;
    const energy = this.moleculeStocks.energy || 0;
    const glucose = this.moleculeStocks.glucose || 0;
    const oxygen = this.moleculeStocks.oxygen || 0;
    
    // Health factors that led to death
    console.log('� MOLECULAR DEATH ANALYSIS:');
    console.log(`   Waste Level: ${waste.toFixed(1)}/${this.moleculeCapacities.waste || 300} (${((waste / (this.moleculeCapacities.waste || 300)) * 100).toFixed(1)}%)`);
    console.log(`   CO₂ Level: ${co2.toFixed(1)}/${this.moleculeCapacities.co2 || 150} (${((co2 / (this.moleculeCapacities.co2 || 150)) * 100).toFixed(1)}%)`);
    console.log(`   ATP Level: ${atp.toFixed(1)}/${this.moleculeCapacities.atp || 600}`);
    console.log(`   Energy Level: ${energy.toFixed(1)}/100`);
    console.log(`   Glucose Level: ${glucose.toFixed(1)}/${this.moleculeCapacities.glucose || 300}`);
    console.log(`   Oxygen Level: ${oxygen.toFixed(1)}/${this.moleculeCapacities.oxygen || 200}`);
    console.log('');
    
    // Active processes at death
    console.log('⚙️ ACTIVE PROCESSES AT DEATH:');
    const activeProcesses = this.cellularProcesses.filter(p => p.active);
    if (activeProcesses.length > 0) {
      activeProcesses.forEach(process => {
        console.log(`   ✅ ${process.name} (Efficiency: ${(process.efficiency * 100).toFixed(1)}%)`);
      });
    } else {
      console.log('   ❌ NO ACTIVE PROCESSES - This likely contributed to death!');
    }
    console.log('');
    
    // Inactive but available processes
    const inactiveProcesses = this.cellularProcesses.filter(p => !p.active && p.unlocked !== false);
    if (inactiveProcesses.length > 0) {
      console.log('💤 AVAILABLE BUT INACTIVE PROCESSES:');
      inactiveProcesses.forEach(process => {
        const canRun = this.canRunProcess(process);
        const status = canRun ? '✅ Could run' : '❌ Missing resources';
        console.log(`   ${process.name}: ${status}`);
        if (!canRun) {
          // Check what resources are missing
          process.requirements.forEach(req => {
            const available = this.moleculeStocks[req.molecule] || 0;
            if (available < req.amount) {
              console.log(`     - Missing ${req.molecule}: need ${req.amount}, have ${available.toFixed(1)}`);
            }
          });
        }
      });
      console.log('');
    }
    
    // Current goals and objectives
    if (this.goals.length > 0) {
      console.log('🎯 GOALS AT DEATH:');
      this.goals.forEach(goal => {
        const status = goal.completed ? '✅ COMPLETED' : '❌ FAILED';
        const progress = goal.target > 0 ? `(${((goal.current / goal.target) * 100).toFixed(1)}%)` : '';
        console.log(`   ${goal.name}: ${status} ${progress}`);
        console.log(`     ${goal.description}`);
      });
      console.log('');
    }
    
    // Recent events or alerts
    console.log('📢 RECENT EVENTS:');
    if (this.activeEvents.length > 0) {
      this.activeEvents.slice(-5).forEach(event => {
        console.log(`   - ${event.name}: ${event.description}`);
      });
    } else {
      console.log('   No recent events recorded');
    }
    console.log('');
    
    // Survival recommendations
    console.log('💡 SURVIVAL ANALYSIS:');
    if (this.energyLevel <= 0) {
      console.log('   🔋 Energy was depleted! Ensure glucose uptake and cellular respiration are active.');
    }
    if (this.cellHealth <= 0) {
      console.log('   💊 Health reached zero! Monitor molecule levels and avoid toxic conditions.');
    }
    if (this.moleculeStocks.glucose < 2) {
      console.log('   🍯 Glucose starvation! Activate glucose uptake process.');
    }
    if (this.moleculeStocks.oxygen < 3) {
      console.log('   💨 Oxygen starvation! Activate oxygen transport process.');
    }
    if (this.moleculeStocks.waste > 20) {
      console.log('   🗑️ Toxic waste levels! Activate waste removal process.');
    }
    if (activeProcesses.length < 2) {
      console.log('   ⚙️ Too few active processes! Cells need active metabolism to survive.');
    }
    
    console.log('========================================');
    console.log('End of death analysis. Press F12 to see this log.');
    console.log('========================================');
  }

  private getMoleculeCriticalLevel(molecule: string): number {
    const criticalLevels: { [key: string]: number } = {
      'glucose': 5,
      'oxygen': 3,
      'water': 10,
      'atp': 5,
      'amino_acids': 0,
      'lipids': 0,
      'fatty_acids': 0,
      'nucleotides': 0,
      'rna': 0,
      'dna': 0,
      'proteins': 0,
      'enzymes': 0,
      'organelles': 0,
      'co2': 10,
      'waste': 15
    };
    return criticalLevels[molecule] || 0;
  }

  private triggerRandomEvent(): void {
    const events = [
      {
        name: 'Oxidative Stress',
        description: 'Free radicals attack! Oxygen consumption increases!',
        effect: () => {
          this.moleculeStocks.oxygen = Math.max(0, (this.moleculeStocks.oxygen || 0) - 15);
          this.moleculeStocks.waste = (this.moleculeStocks.waste || 0) + 10; // Convert to waste production
        },
        type: 'danger' as const
      },
      {
        name: 'Nutrient Shortage',
        description: 'External glucose supply depleted!',
        effect: () => {
          this.moleculeStocks.glucose = Math.max(0, (this.moleculeStocks.glucose || 0) - 20);
        },
        type: 'warning' as const
      },
      {
        name: 'Toxin Exposure',
        description: 'Environmental toxins entering cell!',
        effect: () => {
          this.moleculeStocks.waste = (this.moleculeStocks.waste || 0) + 25;
          this.moleculeStocks.co2 = (this.moleculeStocks.co2 || 0) + 15; // Additional toxic stress
        },
        type: 'danger' as const
      },
      {
        name: 'Membrane Damage',
        description: 'Cell membrane integrity compromised!',
        effect: () => {
          this.moleculeStocks.water = Math.max(0, (this.moleculeStocks.water || 0) - 30);
          this.energyLevel = Math.max(0, this.energyLevel - 25);
        },
        type: 'danger' as const
      },
      {
        name: 'Growth Signal',
        description: 'Growth hormones detected! ATP boost!',
        effect: () => {
          this.moleculeStocks.atp = (this.moleculeStocks.atp || 0) + 50;
          this.energyLevel = Math.min(100, this.energyLevel + 20);
        },
        type: 'info' as const
      }
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    event.effect();
    this.showAlert(event.description, event.type);
  }

  private triggerDailyChallenge(): void {
    const challenges = [
      {
        name: 'Heat Stress',
        description: `Day ${this.day}: Temperature rising! Energy consumption increased by 50%!`,
        effect: () => {
          // This will be applied in environmental effects
        }
      },
      {
        name: 'Low Oxygen Environment', 
        description: `Day ${this.day}: Oxygen levels dropping! Respiration efficiency reduced!`,
        effect: () => {
          // Reduce oxygen transport efficiency
        }
      },
      {
        name: 'Nutrient Competition',
        description: `Day ${this.day}: Competing with other cells for resources!`,
        effect: () => {
          // Reduce glucose uptake efficiency
        }
      }
    ];
    
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];
    challenge.effect();
    this.showAlert(challenge.description, 'info');
  }

  private applyEnvironmentalEffects(): void {
    // Day/night cycle effects
    const hour = this.timeOfDay;
    
    if (hour >= 6 && hour <= 18) {
      // Daytime: More active metabolism
      this.healthFactors.push({
        factor: 'Daytime Activity',
        impact: 0.5,
        description: 'Daytime: Enhanced metabolism (+0.5 health/sec)'
      });
    } else {
      // Nighttime: Repair mode but slower metabolism
      this.healthFactors.push({
        factor: 'Nighttime Repair',
        impact: -0.2,
        description: 'Nighttime: Slower metabolism but cellular repair'
      });
      
      // Reduce waste at night (repair mode)
      this.moleculeStocks.waste = Math.max(0, (this.moleculeStocks.waste || 0) - 1.5);
    }
    
    // Difficulty scaling
    if (this.day >= 3) {
      this.healthFactors.push({
        factor: 'Environmental Stress',
        impact: -0.5 * this.difficulty,
        description: `Day ${this.day}: Increasing environmental challenges`
      });
    }
  }

  private gameOver(): void {
    const { width, height } = this.scale;
    
    // Stop the game loop
    this.gameSpeed = 0;
    this.isPaused = true;
    
    // Create a semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    
    // Create a death analysis panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2c3e50, 0.95);
    panelBg.lineStyle(3, 0xe74c3c, 1);
    panelBg.fillRoundedRect(width / 2 - 400, height / 2 - 300, 800, 600, 15);
    panelBg.strokeRoundedRect(width / 2 - 400, height / 2 - 300, 800, 600, 15);
    
    // Title
    this.add.text(width / 2, height / 2 - 250, 'CELL DEATH', {
      fontSize: '48px',
      color: '#e74c3c',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Get the specific cause of death that was determined in checkGameState
    const deathReason = (this as any).deathReason || 'Unknown Cause';
    let deathDetails = '';
    
    switch (deathReason) {
      case 'Complete Energy Failure':
        deathDetails = 'Your cell ran completely out of energy (ATP and cellular energy). Cells need constant energy to maintain basic functions.';
        break;
      case 'Toxic Waste Overload':
        deathDetails = 'Toxic waste products accumulated to lethal levels. Cells must actively remove waste to survive.';
        break;
      case 'Critical Resource Depletion':
        deathDetails = 'Multiple essential molecules (ATP, glucose, oxygen) dropped to critically low levels simultaneously.';
        break;
      case 'Severe Energy Crisis':
        deathDetails = 'Your cell entered a severe energy crisis with both ATP and energy levels dangerously low.';
        break;
      default:
        deathDetails = 'Your cell died due to molecular imbalances. Check the console (F12) for detailed analysis.';
    }
    
    this.add.text(width / 2, height / 2 - 180, `Cause: ${deathReason}`, {
      fontSize: '28px',
      color: '#f39c12',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, height / 2 - 130, deathDetails, {
      fontSize: '18px',
      color: '#bdc3c7',
      align: 'center',
      wordWrap: { width: 700 }
    }).setOrigin(0.5);
    
    // Show survival time
    this.add.text(width / 2, height / 2 - 80, `Survived: ${this.day} days, ${Math.floor(this.timeOfDay)} hours`, {
      fontSize: '20px',
      color: '#95a5a6',
      align: 'center'
    }).setOrigin(0.5);
    
    // Show critical stats at death
    const criticalMolecules = ['atp', 'glucose', 'oxygen', 'waste'];
    let statsText = 'Critical molecules at death:\n';
    criticalMolecules.forEach(mol => {
      const amount = Math.round(this.moleculeStocks[mol] || 0);
      const capacity = this.moleculeCapacities[mol] || 100;
      statsText += `${mol.toUpperCase()}: ${amount}/${capacity}   `;
    });
    
    this.add.text(width / 2, height / 2 - 20, statsText, {
      fontSize: '16px',
      color: '#7f8c8d',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);
    
    // Show key molecular status that led to death
    let molecularStatus = 'Key molecular levels:\n';
    molecularStatus += `ATP: ${Math.round(this.moleculeStocks.atp || 0)} (critical for energy)\n`;
    molecularStatus += `Waste: ${Math.round(this.moleculeStocks.waste || 0)} (toxic when high)\n`;
    molecularStatus += `Glucose: ${Math.round(this.moleculeStocks.glucose || 0)} (fuel source)\n`;
    molecularStatus += `Oxygen: ${Math.round(this.moleculeStocks.oxygen || 0)} (needed for respiration)`;
    
    this.add.text(width / 2, height / 2 + 40, molecularStatus, {
      fontSize: '14px',
      color: '#e67e22',
      align: 'center',
      lineSpacing: 5
    }).setOrigin(0.5);
    
    // Console log reminder
    this.add.text(width / 2, height / 2 + 120, 'Press F12 for detailed death analysis in console', {
      fontSize: '14px',
      color: '#3498db',
      align: 'center',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    
    // Restart button
    const restartButton = this.add.graphics();
    restartButton.fillStyle(0x27ae60, 0.9);
    restartButton.lineStyle(2, 0x2ecc71, 1);
    restartButton.fillRoundedRect(width / 2 - 100, height / 2 + 160, 200, 50, 10);
    restartButton.strokeRoundedRect(width / 2 - 100, height / 2 + 160, 200, 50, 10);
    
    const restartText = this.add.text(width / 2, height / 2 + 185, 'RESTART', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Make restart button interactive
    const restartContainer = this.add.container(0, 0, [restartButton, restartText]);
    restartContainer.setSize(200, 50);
    restartContainer.setInteractive(new Phaser.Geom.Rectangle(width / 2 - 100, height / 2 + 160, 200, 50), Phaser.Geom.Rectangle.Contains);
    
    restartContainer.on('pointerover', () => {
      restartButton.clear();
      restartButton.fillStyle(0x2ecc71, 1);
      restartButton.lineStyle(2, 0x27ae60, 1);
      restartButton.fillRoundedRect(width / 2 - 100, height / 2 + 160, 200, 50, 10);
      restartButton.strokeRoundedRect(width / 2 - 100, height / 2 + 160, 200, 50, 10);
    });
    
    restartContainer.on('pointerout', () => {
      restartButton.clear();
      restartButton.fillStyle(0x27ae60, 0.9);
      restartButton.lineStyle(2, 0x2ecc71, 1);
      restartButton.fillRoundedRect(width / 2 - 100, height / 2 + 160, 200, 50, 10);
      restartButton.strokeRoundedRect(width / 2 - 100, height / 2 + 160, 200, 50, 10);
    });
    
    restartContainer.on('pointerdown', () => {
      this.restartGame();
    });
    
    console.log('💀 Cell has died! Check the detailed death analysis above.');
  }

  private restartGame(): void {
    // Reset all game state to initial values
    this.moleculeStocks = {
      glucose: 20,
      oxygen: 25,
      water: 50,
      atp: 10,
      pyruvate: 0,
      amino_acids: 0,
      proteins: 0,
      lipids: 0,
      fatty_acids: 0,
      nucleotides: 0,
      rna: 0,
      dna: 0,
      co2: 5,
      waste: 0,
      enzymes: 0,
      organelles: 0
    };
    
    this.previousMoleculeStocks = {};
    
    // Reset all cellular processes to inactive
    this.cellularProcesses.forEach(process => {
      process.active = false;
      process.efficiency = 1.0;
      process.timeRemaining = 0;
    });
    
    // Reset game state variables
    this.energyLevel = 50;
    this.difficulty = 1;
    this.cellSize = 1;
    this.reproductionProgress = 0;
    this.day = 1;
    this.timeOfDay = 0;
    this.gameSpeed = 1.0;
    this.isPaused = false;
    
    // Reset achievements and goals
    this.achievements = [];
    this.goals = [];
    this.activeEvents = [];
    this.healthFactors = [];
    
    // Clear any existing timers or tweens
    this.time.removeAllEvents();
    this.tweens.killAll();
    
    // Clear all notifications
    this.notifications.forEach(notification => notification.destroy());
    this.notifications = [];
    this.recentNotifications.clear();
    
    // Restart the scene to rebuild UI with fresh state
    this.scene.restart();
  }

  private gameWin(): void {
    const { width, height } = this.scale;
    
    // Stop the game loop
    this.gameSpeed = 0;
    this.isPaused = true;
    
    // Create a semi-transparent overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    
    // Create a victory panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x2c3e50, 0.95);
    panelBg.lineStyle(3, 0x2ecc71, 1);
    panelBg.fillRoundedRect(width / 2 - 300, height / 2 - 200, 600, 400, 15);
    panelBg.strokeRoundedRect(width / 2 - 300, height / 2 - 200, 600, 400, 15);
    
    this.add.text(width / 2, height / 2 - 120, `CELL THRIVES!`, {
      fontSize: '42px',
      color: '#2ecc71',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, height / 2 - 60, `Survived ${this.day} days!`, {
      fontSize: '24px',
      color: '#27ae60',
      align: 'center'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, height / 2 - 10, 'Congratulations! Your cell has successfully\nthrived for a full week.', {
      fontSize: '18px',
      color: '#bdc3c7',
      align: 'center'
    }).setOrigin(0.5);
    
    // Restart button
    const restartButton = this.add.graphics();
    restartButton.fillStyle(0x3498db, 0.9);
    restartButton.lineStyle(2, 0x2980b9, 1);
    restartButton.fillRoundedRect(width / 2 - 100, height / 2 + 60, 200, 50, 10);
    restartButton.strokeRoundedRect(width / 2 - 100, height / 2 + 60, 200, 50, 10);
    
    const restartText = this.add.text(width / 2, height / 2 + 85, 'PLAY AGAIN', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Make restart button interactive
    const restartContainer = this.add.container(0, 0, [restartButton, restartText]);
    restartContainer.setSize(200, 50);
    restartContainer.setInteractive(new Phaser.Geom.Rectangle(width / 2 - 100, height / 2 + 60, 200, 50), Phaser.Geom.Rectangle.Contains);
    
    restartContainer.on('pointerover', () => {
      restartButton.clear();
      restartButton.fillStyle(0x2980b9, 1);
      restartButton.lineStyle(2, 0x3498db, 1);
      restartButton.fillRoundedRect(width / 2 - 100, height / 2 + 60, 200, 50, 10);
      restartButton.strokeRoundedRect(width / 2 - 100, height / 2 + 60, 200, 50, 10);
    });
    
    restartContainer.on('pointerout', () => {
      restartButton.clear();
      restartButton.fillStyle(0x3498db, 0.9);
      restartButton.lineStyle(2, 0x2980b9, 1);
      restartButton.fillRoundedRect(width / 2 - 100, height / 2 + 60, 200, 50, 10);
      restartButton.strokeRoundedRect(width / 2 - 100, height / 2 + 60, 200, 50, 10);
    });
    
    restartContainer.on('pointerdown', () => {
      this.restartGame();
    });
  }

  private updateStockDisplays(): void {
    // Define the same molecule data for consistency
    const molecules = [
      { key: 'glucose', critical: 5, target: 10 },
      { key: 'oxygen', critical: 3, target: 8 },
      { key: 'water', critical: 10, target: 20 },
      { key: 'atp', critical: 5, target: 15 },
      { key: 'amino_acids', critical: 0, target: 8 },
      { key: 'lipids', critical: 0, target: 4 },
      { key: 'fatty_acids', critical: 0, target: 6 },
      { key: 'nucleotides', critical: 0, target: 6 },
      { key: 'rna', critical: 0, target: 3 },
      { key: 'dna', critical: 0, target: 1 },
      { key: 'proteins', critical: 0, target: 2 },
      { key: 'enzymes', critical: 0, target: 4 },
      { key: 'organelles', critical: 0, target: 2 },
      { key: 'co2', critical: 20, target: 10 },
      { key: 'waste', critical: 15, target: 5 }
    ];
    
    molecules.forEach(mol => {
      const amount = this.moleculeStocks[mol.key] || 0;
      const display = this.stockDisplays.get(mol.key);
      const statusDisplay = this.stockDisplays.get(`${mol.key}_status`);
      
      if (display) {
        display.setText(Math.round(amount).toString()); // Round the numbers!
        
        // Color coding for amount text
        if (amount < mol.critical) {
          display.setColor('#e74c3c'); // Red for critical
        } else if (amount < mol.target) {
          display.setColor('#f39c12'); // Orange for low
        } else {
          display.setColor('#ffffff'); // Normal
        }
      }
      
      if (statusDisplay) {
        // Update status indicator
        let status = '●';
        let statusColor = '#2ecc71'; // Good
        
        if ((mol.key === 'waste' || mol.key === 'co2') && amount > mol.critical) {
          status = '⚠';
          statusColor = '#e74c3c'; // Too high
        } else if (amount < mol.critical) {
          status = '⚠';
          statusColor = '#e74c3c'; // Too low
        } else if (amount < mol.target) {
          status = '●';
          statusColor = '#f39c12'; // OK but could be better
        }
        
        statusDisplay.setText(status);
        statusDisplay.setColor(statusColor);
      }
    });
  }

  private updateStatusDisplay(): void {
    // Update molecule stock displays with current values
    this.updateMoleculeDisplays();
    
    // Update day/time display with pause status
    const dayTimeDisplay = (this as any).dayTimeDisplay;
    if (dayTimeDisplay) {
      let timeText = `Day ${this.day} - ${Math.floor(this.timeOfDay)}:00`;
      if (this.isPaused) {
        timeText += ' (PAUSED)';
        dayTimeDisplay.setColor('#e74c3c'); // Red when paused
      } else if (this.gameSpeed !== 1.0) {
        timeText += ` (${this.gameSpeed}x)`;
        dayTimeDisplay.setColor('#f39c12'); // Orange when speed changed
      } else {
        dayTimeDisplay.setColor('#3498db'); // Blue when normal
      }
      dayTimeDisplay.setText(timeText);
    }
    
    // Clear and recreate status display
    this.statusPanel.removeAll(true);
    
    const { height } = this.scale;
    
    // Status panel background at bottom
    const statusBg = this.add.graphics();
    statusBg.fillStyle(0x2c3e50, 0.9);
    statusBg.fillRoundedRect(20, height - 200, 600, 180, 10);
    
    // Energy bar - much larger and repositioned
    const energyBar = this.add.graphics();
    energyBar.fillStyle(0x3498db);
    const energyWidth = Math.max(0, (Math.max(0, this.energyLevel) / 100) * 300); // Much larger bar: 300px wide
    energyBar.fillRect(40, height - 180, energyWidth, 45); // Much thicker: 45px high, repositioned to replace health
    energyBar.lineStyle(4, 0xffffff); // Thicker border
    energyBar.strokeRect(40, height - 180, 300, 45);
    
    const energyText = this.add.text(40, height - 210, `Energy: ${Math.floor(Math.max(0, this.energyLevel))}%`, {
      fontSize: '18px', // Reduced from 24px for better readability
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    // Waste level bar - critical health metric
    const wasteLevel = this.moleculeStocks.waste || 0;
    const wasteCapacity = this.moleculeCapacities.waste || 300;
    const wastePercentage = (wasteLevel / wasteCapacity) * 100;
    
    const wasteBar = this.add.graphics();
    wasteBar.fillStyle(wastePercentage > 66 ? 0xff0000 : wastePercentage > 33 ? 0xff8c00 : 0x4caf50);
    wasteBar.fillRect(40, height - 120, (wastePercentage / 100) * 300, 45);
    wasteBar.lineStyle(4, 0xffffff);
    wasteBar.strokeRect(40, height - 120, 300, 45);
    
    const wasteText = this.add.text(40, height - 150, `Waste: ${Math.floor(wasteLevel)}/${wasteCapacity} (${Math.floor(wastePercentage)}%)`, {
      fontSize: '16px', // Reduced from 20px for better readability
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    this.statusPanel.add([statusBg, energyBar, wasteBar, energyText, wasteText]);
  }

  update(): void {
    // Main update loop handled by timer events
  }

  private initializeGoals(): void {
    this.goals = [
      {
        name: 'Survive Day 1',
        description: 'Keep the cell alive for 24 hours',
        target: 1,
        current: 0,
        completed: false
      },
      {
        name: 'Energy Master',
        description: 'Maintain energy above 80% for 5 minutes',
        target: 300, // 5 minutes * 60 updates
        current: 0,
        completed: false
      },
      {
        name: 'Waste Manager',
        description: 'Keep waste below 10 for an entire day',
        target: 1,
        current: 0,
        completed: false
      },
      {
        name: 'ATP Producer',
        description: 'Accumulate 500 total ATP',
        target: 500,
        current: 0,
        completed: false
      },
      {
        name: 'Toxicity Fighter',
        description: 'Reduce toxicity from 50% to 0%',
        target: 1,
        current: 0,
        completed: false
      }
    ];
  }

  private updateGoals(): void {
    this.goals.forEach(goal => {
      if (goal.completed) return;
      
      switch (goal.name) {
        case 'Survive Day 1':
          goal.current = this.day;
          break;
        case 'Energy Master':
          if (this.energyLevel > 80) {
            goal.current++;
          } else {
            goal.current = 0; // Reset if energy drops
          }
          break;
        case 'Waste Manager':
          if (this.moleculeStocks.waste < 10) {
            // Track progress through day
            goal.current = Math.min(goal.target, this.timeOfDay / 24);
          } else {
            goal.current = 0; // Reset if waste gets too high
          }
          break;
        case 'ATP Producer':
          goal.current = Math.max(goal.current, this.moleculeStocks.atp);
          break;
      }
      
      if (goal.current >= goal.target && !goal.completed) {
        goal.completed = true;
        this.achievements.push(goal.name);
        this.showAlert(`Achievement Unlocked: ${goal.name}!`, 'info');
        this.cellHealth = Math.min(100, this.cellHealth + 10); // Reward
      }
    });
  }
}