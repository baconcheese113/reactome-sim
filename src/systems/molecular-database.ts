import { MoleculeType } from '../entities/Molecule';

export interface DetailedMoleculeProperties {
  id: string;
  type: MoleculeType;
  name: string;
  commonName: string;
  formula: string;
  molecularWeight: number; // g/mol
  color: number;
  size: number;
  energyContent?: number; // kJ/mol
  bindingAffinity: number; // μM (lower = higher affinity)
  description: string;
  structure: {
    carbonCount: number;
    hydrogenCount: number;
    oxygenCount: number;
    phosphateGroups: number;
    ringStructure: boolean;
  };
  biochemicalRole: string[];
  visualRepresentation: {
    shape: 'circle' | 'hexagon' | 'diamond' | 'star';
    glowEffect: boolean;
    particleTrail: boolean;
  };
}

export class molecular_database {
  private static readonly MOLECULE_DATA: Record<MoleculeType, DetailedMoleculeProperties> = {
    [MoleculeType.GLUCOSE]: {
      id: 'glucose',
      type: MoleculeType.GLUCOSE,
      name: 'D-Glucose',
      commonName: 'Blood Sugar',
      formula: 'C₆H₁₂O₆',
      molecularWeight: 180.16,
      color: 0x88ff44,
      size: 1.2,
      energyContent: 2870, // Energy released in complete oxidation
      bindingAffinity: 100, // μM for hexokinase
      description: 'Primary energy substrate for cellular respiration',
      structure: {
        carbonCount: 6,
        hydrogenCount: 12,
        oxygenCount: 6,
        phosphateGroups: 0,
        ringStructure: true,
      },
      biochemicalRole: ['energy_substrate', 'carbon_source'],
      visualRepresentation: {
        shape: 'hexagon',
        glowEffect: true,
        particleTrail: false,
      },
    },
    [MoleculeType.GLUCOSE_6_PHOSPHATE]: {
      id: 'glucose-6-phosphate',
      type: MoleculeType.GLUCOSE_6_PHOSPHATE,
      name: 'Glucose 6-Phosphate',
      commonName: 'G6P',
      formula: 'C₆H₁₃O₉P',
      molecularWeight: 260.14,
      color: 0x66dd33,
      size: 1.3,
      energyContent: 2840,
      bindingAffinity: 400, // μM for PGI
      description: 'First phosphorylated intermediate in glycolysis',
      structure: {
        carbonCount: 6,
        hydrogenCount: 13,
        oxygenCount: 9,
        phosphateGroups: 1,
        ringStructure: true,
      },
      biochemicalRole: ['glycolysis_intermediate', 'pentose_phosphate_precursor'],
      visualRepresentation: {
        shape: 'hexagon',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.FRUCTOSE_6_PHOSPHATE]: {
      id: 'fructose-6-phosphate',
      type: MoleculeType.FRUCTOSE_6_PHOSPHATE,
      name: 'Fructose 6-Phosphate',
      commonName: 'F6P',
      formula: 'C₆H₁₃O₉P',
      molecularWeight: 260.14,
      color: 0x55cc22,
      size: 1.3,
      energyContent: 2810,
      bindingAffinity: 100, // μM for PFK
      description: 'Isomer of G6P, substrate for rate-limiting PFK enzyme',
      structure: {
        carbonCount: 6,
        hydrogenCount: 13,
        oxygenCount: 9,
        phosphateGroups: 1,
        ringStructure: true,
      },
      biochemicalRole: ['glycolysis_intermediate', 'regulatory_point'],
      visualRepresentation: {
        shape: 'hexagon',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.FRUCTOSE_1_6_BISPHOSPHATE]: {
      id: 'fructose-1-6-bisphosphate',
      type: MoleculeType.FRUCTOSE_1_6_BISPHOSPHATE,
      name: 'Fructose 1,6-Bisphosphate',
      commonName: 'F1,6BP',
      formula: 'C₆H₁₄O₁₂P₂',
      molecularWeight: 340.12,
      color: 0x44bb11,
      size: 1.5,
      energyContent: 2780,
      bindingAffinity: 2000, // μM for aldolase
      description: 'Highly phosphorylated sugar, cleaved into triose phosphates',
      structure: {
        carbonCount: 6,
        hydrogenCount: 14,
        oxygenCount: 12,
        phosphateGroups: 2,
        ringStructure: true,
      },
      biochemicalRole: ['glycolysis_intermediate', 'allosteric_activator'],
      visualRepresentation: {
        shape: 'hexagon',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.DIHYDROXYACETONE_PHOSPHATE]: {
      id: 'dihydroxyacetone-phosphate',
      type: MoleculeType.DIHYDROXYACETONE_PHOSPHATE,
      name: 'Dihydroxyacetone Phosphate',
      commonName: 'DHAP',
      formula: 'C₃H₇O₆P',
      molecularWeight: 170.06,
      color: 0x33aa00,
      size: 0.9,
      energyContent: 1390,
      bindingAffinity: 500, // μM for TPI
      description: 'Triose phosphate, rapidly equilibrates with G3P',
      structure: {
        carbonCount: 3,
        hydrogenCount: 7,
        oxygenCount: 6,
        phosphateGroups: 1,
        ringStructure: false,
      },
      biochemicalRole: ['glycolysis_intermediate', 'lipid_synthesis_precursor'],
      visualRepresentation: {
        shape: 'diamond',
        glowEffect: false,
        particleTrail: true,
      },
    },
    [MoleculeType.GLYCERALDEHYDE_3_PHOSPHATE]: {
      id: 'glyceraldehyde-3-phosphate',
      type: MoleculeType.GLYCERALDEHYDE_3_PHOSPHATE,
      name: 'Glyceraldehyde 3-Phosphate',
      commonName: 'G3P',
      formula: 'C₃H₇O₆P',
      molecularWeight: 170.06,
      color: 0x229900,
      size: 0.9,
      energyContent: 1390,
      bindingAffinity: 50, // μM for GAPDH
      description: 'Central triose phosphate, continues through lower glycolysis',
      structure: {
        carbonCount: 3,
        hydrogenCount: 7,
        oxygenCount: 6,
        phosphateGroups: 1,
        ringStructure: false,
      },
      biochemicalRole: ['glycolysis_intermediate', 'calvin_cycle_product'],
      visualRepresentation: {
        shape: 'diamond',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.ONE_3_BISPHOSPHOGLYCERATE]: {
      id: '1-3-bisphosphoglycerate',
      type: MoleculeType.ONE_3_BISPHOSPHOGLYCERATE,
      name: '1,3-Bisphosphoglycerate',
      commonName: '1,3-BPG',
      formula: 'C₃H₈O₁₀P₂',
      molecularWeight: 266.04,
      color: 0x118800,
      size: 1.1,
      energyContent: 1360,
      bindingAffinity: 30, // μM for PGK
      description: 'High-energy acyl phosphate intermediate',
      structure: {
        carbonCount: 3,
        hydrogenCount: 8,
        oxygenCount: 10,
        phosphateGroups: 2,
        ringStructure: false,
      },
      biochemicalRole: ['glycolysis_intermediate', 'high_energy_intermediate'],
      visualRepresentation: {
        shape: 'diamond',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.THREE_PHOSPHOGLYCERATE]: {
      id: '3-phosphoglycerate',
      type: MoleculeType.THREE_PHOSPHOGLYCERATE,
      name: '3-Phosphoglycerate',
      commonName: '3-PG',
      formula: 'C₃H₇O₇P',
      molecularWeight: 186.06,
      color: 0x007700,
      size: 1.0,
      energyContent: 1340,
      bindingAffinity: 200, // μM for PGM
      description: 'Phosphoglycerate isomer from substrate-level phosphorylation',
      structure: {
        carbonCount: 3,
        hydrogenCount: 7,
        oxygenCount: 7,
        phosphateGroups: 1,
        ringStructure: false,
      },
      biochemicalRole: ['glycolysis_intermediate', 'amino_acid_precursor'],
      visualRepresentation: {
        shape: 'diamond',
        glowEffect: false,
        particleTrail: true,
      },
    },
    [MoleculeType.TWO_PHOSPHOGLYCERATE]: {
      id: '2-phosphoglycerate',
      type: MoleculeType.TWO_PHOSPHOGLYCERATE,
      name: '2-Phosphoglycerate',
      commonName: '2-PG',
      formula: 'C₃H₇O₇P',
      molecularWeight: 186.06,
      color: 0x006600,
      size: 1.0,
      energyContent: 1330,
      bindingAffinity: 400, // μM for enolase
      description: 'Phosphoglycerate isomer, substrate for enolase',
      structure: {
        carbonCount: 3,
        hydrogenCount: 7,
        oxygenCount: 7,
        phosphateGroups: 1,
        ringStructure: false,
      },
      biochemicalRole: ['glycolysis_intermediate'],
      visualRepresentation: {
        shape: 'diamond',
        glowEffect: false,
        particleTrail: true,
      },
    },
    [MoleculeType.PHOSPHOENOLPYRUVATE]: {
      id: 'phosphoenolpyruvate',
      type: MoleculeType.PHOSPHOENOLPYRUVATE,
      name: 'Phosphoenolpyruvate',
      commonName: 'PEP',
      formula: 'C₃H₅O₆P',
      molecularWeight: 168.04,
      color: 0x005500,
      size: 1.0,
      energyContent: 1300,
      bindingAffinity: 300, // μM for pyruvate kinase
      description: 'High-energy enol phosphate, final glycolytic intermediate',
      structure: {
        carbonCount: 3,
        hydrogenCount: 5,
        oxygenCount: 6,
        phosphateGroups: 1,
        ringStructure: false,
      },
      biochemicalRole: ['glycolysis_intermediate', 'high_energy_intermediate'],
      visualRepresentation: {
        shape: 'diamond',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.PYRUVATE]: {
      id: 'pyruvate',
      type: MoleculeType.PYRUVATE,
      name: 'Pyruvate',
      commonName: 'Pyruvic Acid',
      formula: 'C₃H₄O₃',
      molecularWeight: 88.06,
      color: 0xff8800,
      size: 0.8,
      energyContent: 1270,
      bindingAffinity: 2900, // μM for LDH
      description: 'End product of glycolysis, gateway to aerobic respiration',
      structure: {
        carbonCount: 3,
        hydrogenCount: 4,
        oxygenCount: 3,
        phosphateGroups: 0,
        ringStructure: false,
      },
      biochemicalRole: ['glycolysis_product', 'tca_cycle_precursor', 'lactate_precursor'],
      visualRepresentation: {
        shape: 'star',
        glowEffect: true,
        particleTrail: false,
      },
    },
    [MoleculeType.ATP]: {
      id: 'atp',
      type: MoleculeType.ATP,
      name: 'Adenosine Triphosphate',
      commonName: 'ATP',
      formula: 'C₁₀H₁₆N₅O₁₃P₃',
      molecularWeight: 507.18,
      color: 0xff0000,
      size: 1.8,
      energyContent: 30.5, // Energy released per hydrolysis
      bindingAffinity: 100, // μM for various ATPases
      description: 'Universal energy currency of cells',
      structure: {
        carbonCount: 10,
        hydrogenCount: 16,
        oxygenCount: 13,
        phosphateGroups: 3,
        ringStructure: true,
      },
      biochemicalRole: ['energy_currency', 'phosphate_donor', 'allosteric_effector'],
      visualRepresentation: {
        shape: 'star',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.ADP]: {
      id: 'adp',
      type: MoleculeType.ADP,
      name: 'Adenosine Diphosphate',
      commonName: 'ADP',
      formula: 'C₁₀H₁₅N₅O₁₀P₂',
      molecularWeight: 427.20,
      color: 0xcc4400,
      size: 1.6,
      energyContent: 0, // Reference state
      bindingAffinity: 200, // μM for various kinases
      description: 'Product of ATP hydrolysis, substrate for ATP synthesis',
      structure: {
        carbonCount: 10,
        hydrogenCount: 15,
        oxygenCount: 10,
        phosphateGroups: 2,
        ringStructure: true,
      },
      biochemicalRole: ['energy_metabolism', 'phosphate_acceptor'],
      visualRepresentation: {
        shape: 'star',
        glowEffect: false,
        particleTrail: false,
      },
    },
    [MoleculeType.NAD]: {
      id: 'nad',
      type: MoleculeType.NAD,
      name: 'Nicotinamide Adenine Dinucleotide',
      commonName: 'NAD⁺',
      formula: 'C₂₁H₂₇N₇O₁₄P₂',
      molecularWeight: 663.43,
      color: 0x0088ff,
      size: 1.9,
      energyContent: 0, // Oxidized form
      bindingAffinity: 50, // μM for GAPDH
      description: 'Oxidized coenzyme, electron acceptor in redox reactions',
      structure: {
        carbonCount: 21,
        hydrogenCount: 27,
        oxygenCount: 14,
        phosphateGroups: 2,
        ringStructure: true,
      },
      biochemicalRole: ['electron_acceptor', 'redox_coenzyme'],
      visualRepresentation: {
        shape: 'circle',
        glowEffect: false,
        particleTrail: false,
      },
    },
    [MoleculeType.NADH]: {
      id: 'nadh',
      type: MoleculeType.NADH,
      name: 'Nicotinamide Adenine Dinucleotide (Reduced)',
      commonName: 'NADH',
      formula: 'C₂₁H₂₉N₇O₁₄P₂',
      molecularWeight: 665.44,
      color: 0x0066dd,
      size: 1.9,
      energyContent: 220, // Reducing potential
      bindingAffinity: 600, // μM for LDH
      description: 'Reduced coenzyme, carries electrons to respiratory chain',
      structure: {
        carbonCount: 21,
        hydrogenCount: 29,
        oxygenCount: 14,
        phosphateGroups: 2,
        ringStructure: true,
      },
      biochemicalRole: ['electron_donor', 'reducing_agent'],
      visualRepresentation: {
        shape: 'circle',
        glowEffect: true,
        particleTrail: true,
      },
    },
    [MoleculeType.PHOSPHATE]: {
      id: 'phosphate',
      type: MoleculeType.PHOSPHATE,
      name: 'Inorganic Phosphate',
      commonName: 'Pi',
      formula: 'H₃PO₄',
      molecularWeight: 97.99,
      color: 0xffaa00,
      size: 0.7,
      energyContent: 0,
      bindingAffinity: 1000, // μM for GAPDH
      description: 'Free phosphate ion, substrate for phosphorylation',
      structure: {
        carbonCount: 0,
        hydrogenCount: 3,
        oxygenCount: 4,
        phosphateGroups: 1,
        ringStructure: false,
      },
      biochemicalRole: ['phosphate_source', 'buffer_component'],
      visualRepresentation: {
        shape: 'circle',
        glowEffect: false,
        particleTrail: false,
      },
    },
    [MoleculeType.WATER]: {
      id: 'water',
      type: MoleculeType.WATER,
      name: 'Water',
      commonName: 'H₂O',
      formula: 'H₂O',
      molecularWeight: 18.02,
      color: 0x4488ff,
      size: 0.5,
      energyContent: 0,
      bindingAffinity: 55000000, // Very high concentration
      description: 'Universal solvent, participates in hydrolysis reactions',
      structure: {
        carbonCount: 0,
        hydrogenCount: 2,
        oxygenCount: 1,
        phosphateGroups: 0,
        ringStructure: false,
      },
      biochemicalRole: ['solvent', 'hydrolysis_participant'],
      visualRepresentation: {
        shape: 'circle',
        glowEffect: false,
        particleTrail: false,
      },
    },
    [MoleculeType.LACTATE]: {
      id: 'lactate',
      type: MoleculeType.LACTATE,
      name: 'Lactate',
      commonName: 'Lactic Acid',
      formula: 'C₃H₆O₃',
      molecularWeight: 90.08,
      color: 0x88ffaa,
      size: 0.8,
      energyContent: 1360,
      bindingAffinity: 2900, // μM for LDH reverse
      description: 'Anaerobic fermentation product of pyruvate',
      structure: {
        carbonCount: 3,
        hydrogenCount: 6,
        oxygenCount: 3,
        phosphateGroups: 0,
        ringStructure: false,
      },
      biochemicalRole: ['fermentation_product', 'gluconeogenesis_substrate'],
      visualRepresentation: {
        shape: 'diamond',
        glowEffect: false,
        particleTrail: false,
      },
    },
  };

  public static getMoleculeProperties(type: MoleculeType): DetailedMoleculeProperties {
    return this.MOLECULE_DATA[type];
  }

  public static getAllMolecules(): DetailedMoleculeProperties[] {
    return Object.values(this.MOLECULE_DATA);
  }

  public static getMoleculesByRole(role: string): DetailedMoleculeProperties[] {
    return Object.values(this.MOLECULE_DATA).filter(
      molecule => molecule.biochemicalRole.includes(role)
    );
  }

  public static calculateMolecularComplexity(type: MoleculeType): number {
    const props = this.MOLECULE_DATA[type];
    const complexity = 
      props.structure.carbonCount * 1.0 +
      props.structure.phosphateGroups * 2.0 +
      (props.structure.ringStructure ? 1.5 : 0) +
      props.biochemicalRole.length * 0.5;
    
    return complexity;
  }

  public static getBindingStrength(substrate: MoleculeType, product: MoleculeType): number {
    const substrateProps = this.MOLECULE_DATA[substrate];
    const productProps = this.MOLECULE_DATA[product];
    
    // Calculate binding strength based on molecular properties
    const affinityDifference = Math.abs(
      Math.log(substrateProps.bindingAffinity) - Math.log(productProps.bindingAffinity)
    );
    
    return Math.max(0.1, 1.0 - affinityDifference * 0.1);
  }

  public static isHighEnergyMolecule(type: MoleculeType): boolean {
    const props = this.MOLECULE_DATA[type];
    return (props.energyContent && props.energyContent > 100) || 
           props.biochemicalRole.includes('high_energy_intermediate');
  }
}