import { Component, OnInit } from '@angular/core';

import { Agent1 } from 'src/app/agents/agent1';
import { Agent2 } from 'src/app/agents/agent2';
import { Agent3 } from 'src/app/agents/agent3';
import { Agent4 } from 'src/app/agents/agent4';
import { SignalInterface } from 'src/app/agents/interfaces';
import { HWTvalues } from 'src/app/pages/sim-form/values';

@Component({
  selector: 'app-sim-form',
  templateUrl: './sim-form.component.html',
  styleUrls: ['./sim-form.component.css']
})
export class SimFormComponent implements OnInit {

  // Parametros de la infraestructuras
  metrosCubricosPorMetroAlturaLamina = 350;
  metrosCubricosPorHoraBomba = 100;

  // parametros para simular la evolucion de la preisón
  alturaDeposito = 47;
  constantePorConsumo = 15; // esto es lo máximo que puede llegar a bajar la presión por consumo
  constentePorBombeo = 15; // maximo que puede subir la presión por bombeo
  consumoMaximo = 100;

  // Estado inicial de la señalas, lamina de agua 0,75 y presion 2, no hay consumo
  signals = {
    // entrada
    laminaAgua: 0.9,
    aguaDesdeDeposito: 0,
    aguaDesdeBomba: 0,
    aguaHaciaDeposito: 0,
    presionAgua: this.alturaDeposito,
    // internas
    deseoLamina: 0,
    deseoInercia: 0,
    deseoPresion: 0,
    // salida
    influenciaMotor: 0,

    // estado bombas y cálculo de flujo 
    consumoCiudad: 0,
    estadoBombas: 0,

    // histórico
    historico: '',
  }

  word: SignalInterface[] = [];

  // Opciones de configuración del charts;
  merge: any = {
    xAxis: {
      data: [] = []
    },
    series: [
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    ],
  };

  options: any = {

    legend: {
      data: ['HWT', '-WTF', 'WPF', '+WTF', 'Preassure', 'I1', 'I2', 'I3', 'I4', 'PS', 'CC']
    },
    toolbox: {
      feature: {
        saveAsImage: {}
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: []
    },
    // yAxis: {
    //   type: 'value'
    // },
    yAxis: [
      {
        name: 'Flow(m³/s)/Preassure mwc',
        type: 'value'
      },
      {
        name: 'Influence/HWT',
        type: 'value'
      },
    ],
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 1000
      },
      {
        start: 0,
        end: 1000
      }
    ],
    series: [
      {
        name: 'HWT',
        type: 'line',
        yAxisIndex: 1,
        data: []
      },
      {
        name: '-WTF',
        type: 'line',
        yAxisIndex: 0,
        data: []
      },
      {
        name: 'WPF',
        type: 'line',
        yAxisIndex: 0,
        data: []
      },
      {
        name: '+WTF',
        type: 'line',
        yAxisIndex: 0,
        data: []
      },
      {
        name: 'Preassure',
        type: 'line',
        yAxisIndex: 0,
        data: []
      },
      {
        name: 'I1',
        type: 'line',
        yAxisIndex: 1,
        data: []
      },
      {
        name: 'I2',
        type: 'line',
        yAxisIndex: 1,
        data: []
      },
      {
        name: 'I3',
        type: 'line',
        yAxisIndex: 1,
        data: []
      },
      {
        name: 'I4',
        type: 'line',
        yAxisIndex: 1,
        data: []
      },
      {
        name: 'PS',
        type: 'line',
        yAxisIndex: 1,
        data: []
      },
      {
        name: 'CC',
        type: 'line',
        yAxisIndex: 0,
        data: []
      }
      
    ]
  };

  // Configuración de simulador
  timeoutID: any;
  timerActive: boolean = false;
  time = 10; // ms
  miliSegundosPorHora = 24 * 60 * 60 * 1000;
  tiempoCiclo = 1000 * 60; // tiempo que transcurre en cada timer

  // Creamos el agente 1
  agent1: Agent1 = new Agent1();
  agent2: Agent2 = new Agent2();
  agent3: Agent3 = new Agent3();
  agent4: Agent4 = new Agent4();

  index: number = 0;
  HWTsim:number[]=[];

  constructor() {

  }

  ngOnInit() {

    this.readWord();
    this.valuesToOptions();

  }

  printData(){
    console.log(this.HWTsim);
  }

  // Funciones para automatizar la generación de data
  start() {
    this.timerActive = true;
    this.timeoutID = setTimeout(() => {
      this.signals.consumoCiudad = HWTvalues[this.index];
      this.index++;
      this.emitir();
      if (this.index < HWTvalues.length) this.start();
    }, this.time)
  }

  stop() {
    this.timerActive = false;
    clearTimeout(this.timeoutID);
  }

  emitir() {
    // calculamos los flujos
    this.calcularFlujos();
    // Calculamos los agentes con el estado del mundo

    let res = this.agent1.percept(this.readWord());
    this.signals.deseoLamina = res[0].value;

    res = this.agent2.percept(this.readWord());
    this.signals.deseoInercia = res[0].value;

    res = this.agent3.percept(this.readWord());
    this.signals.deseoPresion = res[0].value;

    res = this.agent4.percept(this.readWord());
    this.signals.influenciaMotor = res[0].value;
    this.influirSobremotor();

    this.valuesToOptions();

  }

  influirSobremotor() {
    // Vemos el valor de influenciaMotor y cambiamos el estado del motor

    // La variable reactivo hace que sea más reactivo (proximo a 1) o menos reactivo (cercano a 0)
    let reaccion = 1;

    if (this.signals.influenciaMotor == 0) return; // no hay que hacer nada
    // Si queremos que pare y están encendidas
    if (this.signals.influenciaMotor < 0) {
      // calculamos cuanta potencia vamos a restar al motor
      let pow = Math.abs(reaccion * this.signals.influenciaMotor);
      this.signals.estadoBombas = Math.max(this.signals.estadoBombas - pow, 0);
    }
    // si queremos arrancar y está parado
    if (this.signals.influenciaMotor > 0) {
      let pow = Math.abs(reaccion * this.signals.influenciaMotor);
      this.signals.estadoBombas = Math.min(this.signals.estadoBombas + pow, 1);
    }
  }

  calcularFlujos() {
    // Si las bombas están encendidas, están generando agua
    this.signals.aguaDesdeBomba = this.signals.estadoBombas * this.metrosCubricosPorHoraBomba;

    let consumoInfraestructuras = this.signals.consumoCiudad - this.signals.aguaDesdeBomba;
    if (consumoInfraestructuras > 0) {
      this.signals.aguaDesdeDeposito = consumoInfraestructuras;
      this.signals.aguaHaciaDeposito = 0;
    } else {
      this.signals.aguaDesdeDeposito = 0;
      this.signals.aguaHaciaDeposito = -consumoInfraestructuras;
    }

    let modificarLamina = consumoInfraestructuras / this.miliSegundosPorHora * this.tiempoCiclo;
    this.signals.laminaAgua -= modificarLamina;
    this.HWTsim.push(this.signals.laminaAgua)

    // simular la presión
    // la altura de la lámina del depósito más la altura del depósito
    // menos una presión en función del consumo
    // más una presilón en función del estado de bombeo
    this.signals.presionAgua = this.alturaDeposito +
      this.signals.laminaAgua +
      (this.signals.estadoBombas * this.constentePorBombeo)
      - Math.min(this.constantePorConsumo, this.constantePorConsumo * (this.signals.consumoCiudad / this.consumoMaximo))
  }


  readWord() {
    this.word = [];
    this.word.push({ name: 'HWT', value: this.signals.laminaAgua });
    this.word.push({ name: '-WTF', value: this.signals.aguaDesdeDeposito });
    this.word.push({ name: 'WPF', value: this.signals.aguaDesdeBomba });
    this.word.push({ name: '+WTF', value: this.signals.aguaHaciaDeposito });
    this.word.push({ name: 'Preassure', value: this.signals.presionAgua });
    this.word.push({ name: 'I1', value: this.signals.deseoLamina });
    this.word.push({ name: 'I2', value: this.signals.deseoInercia });
    this.word.push({ name: 'I3', value: this.signals.deseoPresion });
    this.word.push({ name: 'I4', value: this.signals.influenciaMotor });
    this.word.push({ name: 'PS', value: this.signals.estadoBombas });
    this.word.push({ name: 'CC', value: this.signals.consumoCiudad });
    return this.word;
  }

  valuesToOptions() {
    let merge: any = {
      xAxis: {
        data: [] = []
      },
      series: [
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
      ],


    }
    this.merge.xAxis.data.push(String(this.merge.xAxis.data.length + 1));
    this.merge.series[0].data.push(this.signals.laminaAgua);
    this.merge.series[1].data.push(this.signals.aguaDesdeDeposito);
    this.merge.series[2].data.push(this.signals.aguaDesdeBomba);
    this.merge.series[3].data.push(this.signals.aguaHaciaDeposito);
    this.merge.series[4].data.push(this.signals.presionAgua);
    this.merge.series[5].data.push(this.signals.deseoLamina);
    this.merge.series[6].data.push(this.signals.deseoInercia);
    this.merge.series[7].data.push(this.signals.deseoPresion);
    this.merge.series[8].data.push(this.signals.influenciaMotor);
    this.merge.series[9].data.push(this.signals.estadoBombas);
    this.merge.series[10].data.push(this.signals.consumoCiudad);
    this.refreshOptions();
  }

  refreshOptions() {
    // Modificamos el valor de options para que se actualice echars
    this.merge = JSON.parse(JSON.stringify(this.merge));
  }

  mostrarValores() {
    console.log('Valores:', this.signals)
  }

}
