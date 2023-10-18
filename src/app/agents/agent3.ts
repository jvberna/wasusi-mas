import { SignalInterface } from "./interfaces";

export class Agent3 {

    watchList: string[] = ['Preassure'];
    mu: number = 0.1;
    memory: SignalInterface[] = [];
    perception: SignalInterface[] = [];
    influence = 0;

    constructor() {

    }

    percept(mundo: SignalInterface[]) {
        // Buscamos en el array las señales que nos interesan
        const intereses = mundo.filter(signal => this.watchList.includes(signal.name));

        // Si ha llegado alguna señal que nos interese la guardamos en percepcion y llamamos al resto de funciones
        if (intereses.length > 0) {
            this.perception = JSON.parse(JSON.stringify(intereses));
            this.mem()
            this.decision();
            this.exec()
        }
        return ([{ name: 'I3', value: this.influence }])

    }

    mem() {
        // calcular distancia y memorizar si distancia es grande
        let valueMemory = 0, valuePerpection = 0;
        this.memory.forEach(element => valueMemory += Math.abs(element.value));
        this.perception.forEach(element => valuePerpection += Math.abs(element.value));
        let distancia = Math.abs(valuePerpection - valueMemory)
        if (distancia >= this.mu) {
            this.memory = this.perception;
        }
    }

    decision() {
        // Nos quedamos con el consumo calculado
        let elem = this.perception.find(element => element.name == this.watchList[0]) || { name: this.watchList[0], value: 0 };
        let value = elem.value;
        if (value < 44.5) this.influence = 1;
        if (44.5<=value && value<=50.5) this.influence = 0;
        if (value>50.5) this.influence = -1;
        
        /*if (value < 40) this.Dp = 1;
        if (40 <= value && value < 42) this.Dp = 1 - (value - 40) / 2;
        if (42 <= value && value <= 54) this.Dp = 0;
        if (54 < value && value <= 56) this.Dp = -(value - 54) / 2;
        if (value > 56) this.Dp = -1;*/
    }

    exec() {
        // En este caso exec no hace nada pues simplemente hay que pasar el valor de Dl
    }


}