export enum EnzymeType {
  HEXOKINASE = 'hexokinase',
  PHOSPHOGLUCOSE_ISOMERASE = 'phosphoglucose_isomerase',
  PHOSPHOFRUCTOKINASE = 'phosphofructokinase',
  ALDOLASE = 'aldolase',
  TRIOSE_PHOSPHATE_ISOMERASE = 'triose_phosphate_isomerase',
  GLYCERALDEHYDE_3_PHOSPHATE_DEHYDROGENASE = 'glyceraldehyde_3_phosphate_dehydrogenase',
  PHOSPHOGLYCERATE_KINASE = 'phosphoglycerate_kinase',
  PHOSPHOGLYCERATE_MUTASE = 'phosphoglycerate_mutase',
  ENOLASE = 'enolase',
  PYRUVATE_KINASE = 'pyruvate_kinase',
  LACTATE_DEHYDROGENASE = 'lactate_dehydrogenase',
  GLUCOSE_6_PHOSPHATE_DEHYDROGENASE = 'glucose_6_phosphate_dehydrogenase'
}

export interface EnzymeProperties {
  type: EnzymeType;
  activity: number;
  efficiency: number;
  name: string;
}

export class Enzyme {
  public properties: EnzymeProperties;
  public isPlaced: boolean = false;
  public x: number = 0;
  public y: number = 0;

  constructor(type: EnzymeType, name: string) {
    this.properties = {
      type,
      activity: 1.0,
      efficiency: 1.0,
      name
    };
  }

  public place(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.isPlaced = true;
  }

  public remove(): void {
    this.isPlaced = false;
    this.x = 0;
    this.y = 0;
  }

  public getActivity(): number {
    return this.properties.activity * this.properties.efficiency;
  }
}