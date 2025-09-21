import { EnzymeType } from '../entities/Enzyme';
import { MoleculeType } from '../entities/Molecule';

export interface GlycolysisStep {
  stepNumber: number;
  enzyme: EnzymeType;
  substrates: MoleculeType[];
  products: MoleculeType[];
  cofactors: string[];
  energyChange: number; // ΔG in kJ/mol
  isRegulatory: boolean;
  description: string;
  reversible: boolean;
}

export interface EnzymeKinetics {
  km: number; // Michaelis constant (mM)
  vmax: number; // Maximum velocity (μmol/min/mg)
  kcat: number; // Turnover number (s⁻¹)
  inhibitors: string[];
  activators: string[];
}

export class glycolysis_database {
  private static readonly GLYCOLYSIS_STEPS: GlycolysisStep[] = [
    {
      stepNumber: 1,
      enzyme: EnzymeType.HEXOKINASE,
      substrates: [MoleculeType.GLUCOSE, MoleculeType.ATP],
      products: [MoleculeType.GLUCOSE_6_PHOSPHATE, MoleculeType.ADP],
      cofactors: ['Mg²⁺'],
      energyChange: -16.7,
      isRegulatory: false,
      description: 'Glucose phosphorylation to glucose-6-phosphate',
      reversible: false,
    },
    {
      stepNumber: 2,
      enzyme: EnzymeType.PHOSPHOGLUCOSE_ISOMERASE,
      substrates: [MoleculeType.GLUCOSE_6_PHOSPHATE],
      products: [MoleculeType.FRUCTOSE_6_PHOSPHATE],
      cofactors: [],
      energyChange: 1.7,
      isRegulatory: false,
      description: 'Isomerization of glucose-6-phosphate to fructose-6-phosphate',
      reversible: true,
    },
    {
      stepNumber: 3,
      enzyme: EnzymeType.PHOSPHOFRUCTOKINASE,
      substrates: [MoleculeType.FRUCTOSE_6_PHOSPHATE, MoleculeType.ATP],
      products: [MoleculeType.FRUCTOSE_1_6_BISPHOSPHATE, MoleculeType.ADP],
      cofactors: ['Mg²⁺', 'K⁺'],
      energyChange: -14.2,
      isRegulatory: true, // Key regulatory step
      description: 'Phosphorylation of fructose-6-phosphate (committed step)',
      reversible: false,
    },
    {
      stepNumber: 4,
      enzyme: EnzymeType.ALDOLASE,
      substrates: [MoleculeType.FRUCTOSE_1_6_BISPHOSPHATE],
      products: [MoleculeType.DIHYDROXYACETONE_PHOSPHATE, MoleculeType.GLYCERALDEHYDE_3_PHOSPHATE],
      cofactors: [],
      energyChange: 23.8,
      isRegulatory: false,
      description: 'Cleavage of fructose-1,6-bisphosphate into two triose phosphates',
      reversible: true,
    },
    {
      stepNumber: 5,
      enzyme: EnzymeType.TRIOSE_PHOSPHATE_ISOMERASE,
      substrates: [MoleculeType.DIHYDROXYACETONE_PHOSPHATE],
      products: [MoleculeType.GLYCERALDEHYDE_3_PHOSPHATE],
      cofactors: [],
      energyChange: 7.5,
      isRegulatory: false,
      description: 'Isomerization of dihydroxyacetone phosphate',
      reversible: true,
    },
    {
      stepNumber: 6,
      enzyme: EnzymeType.GLYCERALDEHYDE_3_PHOSPHATE_DEHYDROGENASE,
      substrates: [MoleculeType.GLYCERALDEHYDE_3_PHOSPHATE, MoleculeType.NAD, MoleculeType.PHOSPHATE],
      products: [MoleculeType.ONE_3_BISPHOSPHOGLYCERATE, MoleculeType.NADH],
      cofactors: [],
      energyChange: 6.3,
      isRegulatory: false,
      description: 'Oxidation and phosphorylation of glyceraldehyde-3-phosphate',
      reversible: true,
    },
    {
      stepNumber: 7,
      enzyme: EnzymeType.PHOSPHOGLYCERATE_KINASE,
      substrates: [MoleculeType.ONE_3_BISPHOSPHOGLYCERATE, MoleculeType.ADP],
      products: [MoleculeType.THREE_PHOSPHOGLYCERATE, MoleculeType.ATP],
      cofactors: ['Mg²⁺'],
      energyChange: -18.8,
      isRegulatory: false,
      description: 'First ATP-generating step (substrate-level phosphorylation)',
      reversible: true,
    },
    {
      stepNumber: 8,
      enzyme: EnzymeType.PHOSPHOGLYCERATE_MUTASE,
      substrates: [MoleculeType.THREE_PHOSPHOGLYCERATE],
      products: [MoleculeType.TWO_PHOSPHOGLYCERATE],
      cofactors: ['Mg²⁺'],
      energyChange: 4.4,
      isRegulatory: false,
      description: 'Relocation of phosphate group',
      reversible: true,
    },
    {
      stepNumber: 9,
      enzyme: EnzymeType.ENOLASE,
      substrates: [MoleculeType.TWO_PHOSPHOGLYCERATE],
      products: [MoleculeType.PHOSPHOENOLPYRUVATE, MoleculeType.WATER],
      cofactors: ['Mg²⁺'],
      energyChange: 7.5,
      isRegulatory: false,
      description: 'Dehydration to form high-energy phosphoenolpyruvate',
      reversible: true,
    },
    {
      stepNumber: 10,
      enzyme: EnzymeType.PYRUVATE_KINASE,
      substrates: [MoleculeType.PHOSPHOENOLPYRUVATE, MoleculeType.ADP],
      products: [MoleculeType.PYRUVATE, MoleculeType.ATP],
      cofactors: ['Mg²⁺', 'K⁺'],
      energyChange: -31.4,
      isRegulatory: true, // Another regulatory step
      description: 'Second ATP-generating step (final step)',
      reversible: false,
    },
  ];

  private static readonly ENZYME_KINETICS: Record<EnzymeType, EnzymeKinetics> = {
    [EnzymeType.HEXOKINASE]: {
      km: 0.1, // mM
      vmax: 100,
      kcat: 1000,
      inhibitors: ['glucose-6-phosphate', '2-deoxyglucose'],
      activators: [],
    },
    [EnzymeType.PHOSPHOGLUCOSE_ISOMERASE]: {
      km: 0.4,
      vmax: 400,
      kcat: 1700,
      inhibitors: [],
      activators: [],
    },
    [EnzymeType.PHOSPHOFRUCTOKINASE]: {
      km: 0.1,
      vmax: 50,
      kcat: 780,
      inhibitors: ['ATP', 'citrate'],
      activators: ['AMP', 'fructose-2,6-bisphosphate'],
    },
    [EnzymeType.ALDOLASE]: {
      km: 2.0,
      vmax: 200,
      kcat: 1400,
      inhibitors: [],
      activators: [],
    },
    [EnzymeType.TRIOSE_PHOSPHATE_ISOMERASE]: {
      km: 0.5,
      vmax: 800,
      kcat: 4300,
      inhibitors: [],
      activators: [],
    },
    [EnzymeType.GLYCERALDEHYDE_3_PHOSPHATE_DEHYDROGENASE]: {
      km: 0.05,
      vmax: 150,
      kcat: 500,
      inhibitors: ['iodoacetate'],
      activators: [],
    },
    [EnzymeType.PHOSPHOGLYCERATE_KINASE]: {
      km: 0.03,
      vmax: 300,
      kcat: 1200,
      inhibitors: [],
      activators: [],
    },
    [EnzymeType.PHOSPHOGLYCERATE_MUTASE]: {
      km: 0.2,
      vmax: 120,
      kcat: 800,
      inhibitors: [],
      activators: [],
    },
    [EnzymeType.ENOLASE]: {
      km: 0.4,
      vmax: 90,
      kcat: 600,
      inhibitors: ['fluoride'],
      activators: [],
    },
    [EnzymeType.PYRUVATE_KINASE]: {
      km: 0.3,
      vmax: 200,
      kcat: 1000,
      inhibitors: ['ATP', 'acetyl-CoA'],
      activators: ['fructose-1,6-bisphosphate'],
    },
    [EnzymeType.LACTATE_DEHYDROGENASE]: {
      km: 2.9,
      vmax: 600,
      kcat: 1000,
      inhibitors: ['oxamate'],
      activators: [],
    },
    [EnzymeType.GLUCOSE_6_PHOSPHATE_DEHYDROGENASE]: {
      km: 0.06,
      vmax: 80,
      kcat: 400,
      inhibitors: ['6-phosphogluconolactone'],
      activators: [],
    },
  };

  public static getGlycolysisSteps(): GlycolysisStep[] {
    return [...this.GLYCOLYSIS_STEPS];
  }

  public static getStepByNumber(stepNumber: number): GlycolysisStep | undefined {
    return this.GLYCOLYSIS_STEPS.find(step => step.stepNumber === stepNumber);
  }

  public static getStepByEnzyme(enzyme: EnzymeType): GlycolysisStep | undefined {
    return this.GLYCOLYSIS_STEPS.find(step => step.enzyme === enzyme);
  }

  public static getEnzymeKinetics(enzyme: EnzymeType): EnzymeKinetics | undefined {
    return this.ENZYME_KINETICS[enzyme];
  }

  public static getNextStep(currentStep: number): GlycolysisStep | undefined {
    return this.GLYCOLYSIS_STEPS.find(step => step.stepNumber === currentStep + 1);
  }

  public static getPreviousStep(currentStep: number): GlycolysisStep | undefined {
    return this.GLYCOLYSIS_STEPS.find(step => step.stepNumber === currentStep - 1);
  }

  public static validateStepSequence(steps: EnzymeType[]): {
    isValid: boolean;
    errors: string[];
    missingSteps: number[];
  } {
    const errors: string[] = [];
    const missingSteps: number[] = [];
    
    // Check if enzymes are in correct order
    for (let i = 0; i < steps.length; i++) {
      const expectedStep = this.GLYCOLYSIS_STEPS[i];
      if (!expectedStep) {
        errors.push(`Too many enzymes provided`);
        break;
      }
      
      if (steps[i] !== expectedStep.enzyme) {
        errors.push(`Step ${i + 1}: Expected ${expectedStep.enzyme}, got ${steps[i]}`);
      }
    }
    
    // Check for missing steps
    for (let i = steps.length; i < this.GLYCOLYSIS_STEPS.length; i++) {
      missingSteps.push(i + 1);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      missingSteps,
    };
  }

  public static calculateNetATP(): number {
    // Net ATP calculation for complete glycolysis
    const atpConsumed = 2; // Steps 1 and 3
    const atpProduced = 4; // Steps 7 and 10 (×2 because of two G3P molecules)
    return atpProduced - atpConsumed; // Net = +2 ATP
  }

  public static getTotalEnergyChange(): number {
    // Sum all ΔG values for complete pathway
    return this.GLYCOLYSIS_STEPS.reduce((total, step) => {
      // Steps 4-10 occur twice (two G3P molecules)
      const multiplier = step.stepNumber >= 4 ? 2 : 1;
      return total + (step.energyChange * multiplier);
    }, 0);
  }

  public static getRegulatorySteps(): GlycolysisStep[] {
    return this.GLYCOLYSIS_STEPS.filter(step => step.isRegulatory);
  }
}