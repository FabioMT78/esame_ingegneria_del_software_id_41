import type Persona from "../../domain/Persona";

interface PersonaRepository {
  trovaPerCodiceFiscale(codiceFiscale: string): Promise<Persona | null>;
}

export = PersonaRepository;
