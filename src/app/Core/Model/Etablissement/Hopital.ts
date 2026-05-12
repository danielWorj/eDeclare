import { Mairie } from "./Mairie";
import { Structure } from "./Structure";

export interface Hopital extends Structure{
    mairie:Mairie; 
}