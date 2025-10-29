import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PriceDataCalculationsService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger(PriceDataCalculationsService.name);
  }

  // private mathRoundTwoDecimals(value: number) {
  //   return Math.round(value * 100) / 100;
  // }

  private mathRoundTwoDecimals(value: number) {
    return Math.round(value * 100) / 100;
  }

  calculateMetrics(purchasePrice: number, qty: number, currentPrice: number) {
    this.logger.log(
      `calculating: purchasePrice=${purchasePrice}, qty=${qty}, currentPrice=${currentPrice}`,
    );

    // if (purchasePrice <= 0 && qty >= 0 && currentPrice >= 0) return;

    if (purchasePrice <= 0 || qty < 0 || currentPrice < 0) {
      console.log('invalid inputs detected');
      this.logger.warn('invalid price or quantity values');
      throw new Error('invalid price or quantity values');
    }

    // const totalINvestment = Math.round(purchasePrice * qty * 100) / 100;
    const totalINvestment = this.mathRoundTwoDecimals(purchasePrice * qty);
    // console.log('totalINvestment=' + totalINvestment);

    // const presentValue = Math.round(currentPrice * qty * 100) / 100;
    const presentValue = this.mathRoundTwoDecimals(currentPrice * qty);
    this.logger.log('presentValue=' + presentValue);

    const difference = this.mathRoundTwoDecimals(presentValue - totalINvestment);
    // console.log('difference=' + difference);

    let gainLossPercent = null;

    if (totalINvestment > 0) {
      gainLossPercent = this.mathRoundTwoDecimals((difference / totalINvestment) * 100);
      // this.logger.log('gainLossPercent: ' + gainLossPercent);
    } else {
      // console.log('totalINvestment=0, gainLossPercent=null');
      gainLossPercent = null;
    }

    // return {
    //   investment: totalINvestment,
    //   presentValue,
    //   gainLoss: difference,
    //   gainLossPercent,
    // };

    const result = {
      investment: totalINvestment,
      presentValue: presentValue,
      gainLoss: difference,
      gainLossPercent: gainLossPercent,
    };

    // console.log('result:', result);

    return result;
  }

  calculatePeriodReturn(startValue: number, endValue: number) {
    this.logger.log('calculatePeriodReturn: startValue=' + startValue + ', endValue=' + endValue);

    // if (typeof startValue !== 'number' || typeof endValue !== 'number') {
    //   console.log('values are not numbers');
    //   throw new Error('values must be numbers');
    // }

    if (startValue < 0 || endValue < 0) {
      this.logger.warn('negative values not allowed');
      throw new Error('values cannot be negative');
    }

    // console.log('validation passed');

    if (startValue === 0) {
      this.logger.log('startValue is zero, returning null');
      return null;
    }

    // if (startValue > 0) {
    //   const periodReturn = ((endValue - startValue) / startValue) * 100;
    //   return this.mathRoundTwoDecimals(periodReturn);
    // }
    // return null;

    const change = endValue - startValue;
    // console.log('change=' + change);

    const returnPercent = (change / startValue) * 100;
    // this.logger.log('returnPercent: ' + returnPercent);

    const rounded = this.mathRoundTwoDecimals(returnPercent);
    // console.log('rounded: ' + rounded);

    return rounded;
  }
}
