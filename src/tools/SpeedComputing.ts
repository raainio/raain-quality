import {PositionHistory} from '../history/PositionHistory';
import {SpeedMatrix} from './SpeedMatrix';
import {Position} from './Position';
import {CartesianQuality} from '../CartesianQuality';
import {QualityTools} from './QualityTools';

export class SpeedComputing {

    private static FILTER_RATIO = 0.25;

    private filteredRainHistories: PositionHistory[];
    private filteredGaugeHistories: PositionHistory[];

    constructor(
        protected rainHistories: PositionHistory[],
        protected gaugeHistories: PositionHistory[],
        private rangeGaugeLarge: number = SpeedMatrix.DEFAULT_MATRIX_RANGE * CartesianQuality.DEFAULT_SCALE,
        private roundScale: number = CartesianQuality.DEFAULT_SCALE,
    ) {
        this.filteredRainHistories = rainHistories;
        this.filteredGaugeHistories = gaugeHistories;
    }

    static isIn(rangeGaugeLarge: number, valueXY: { x: number, y: number }, compareXY: { x: number, y: number }, scale: number): boolean {

        const xBefore = Math.round((compareXY.x - rangeGaugeLarge) / scale);
        const xAfter = Math.round((compareXY.x + rangeGaugeLarge) / scale);
        const yBefore = Math.round((compareXY.y - rangeGaugeLarge) / scale);
        const yAfter = Math.round((compareXY.y + rangeGaugeLarge) / scale);

        const xValue = Math.round((valueXY.x) / scale);
        const yValue = Math.round((valueXY.y) / scale);

        const inX = (xBefore <= xValue) && (xValue <= xAfter);
        const inY = (yBefore <= yValue) && (yValue <= yAfter);

        return inX && inY;
    }

    public computeSpeedMatrix(date: Date,
                              options: {
                                  periodCount: number,
                                  periodMinutes: number,
                              } = {periodCount: 6, periodMinutes: 30}): SpeedMatrix {

        const periodCount = options.periodCount;
        const periodMinutes = options.periodMinutes;
        const dateTime = date.getTime();
        const dateTimeMinusXmin = dateTime - periodMinutes * 60000;
        const periodLength = Math.round(options.periodMinutes / options.periodCount);
        let trustedIndicator = SpeedMatrix.DEFAULT_TRUSTED_INDICATOR;

        // filter gauge history in the period; more open for gauge to include possible delay
        this.filteredGaugeHistories = this.gaugeHistories.filter(g => {
            if (g.value <= 0) {
                return false;
            }

            const time = g.date.getTime();
            // console.log('filteredGaugeHistories',
            //     new Date(dateTimeMinusXmin).toISOString(), '<=', g.date.toISOString(), '<=', date.toISOString());
            return dateTimeMinusXmin <= time && (time - periodLength * 60000) <= dateTime;
        })
            .map(g => new PositionHistory(g.id, g.date, g.x, g.y, g.value * 12, g.valueFromGauge, g.valueFromRain)) // mm/h
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        // filter rain history in the period and near to gauge
        let cornerLow, cornerHigh;
        const partOfGaugesAreaAndInThePeriod = (rainPositionHistory: PositionHistory) => {
            const time = rainPositionHistory.date.getTime();
            // console.log('filteredRainHistories',
            //     new Date(dateTimeMinusXmin).toISOString(), '<=', rainPositionHistory.date.toISOString(), '<=', date.toISOString());
            const inTheLastXmin = dateTimeMinusXmin <= time && time <= dateTime;
            if (!inTheLastXmin) {
                return false;
            }

            const contains = this.filteredGaugeHistories.filter(g => {
                return SpeedComputing.isIn(this.rangeGaugeLarge, rainPositionHistory, g, this.roundScale);
            });

            if (contains.length > 0) {
                if (!cornerLow) {
                    cornerLow = new Position(rainPositionHistory.x, rainPositionHistory.y);
                }
                if (!cornerHigh) {
                    cornerHigh = new Position(rainPositionHistory.x, rainPositionHistory.y);
                }

                cornerLow.x = Math.min(cornerLow.x, rainPositionHistory.x);
                cornerLow.y = Math.min(cornerLow.y, rainPositionHistory.y);
                cornerHigh.x = Math.max(cornerHigh.x, rainPositionHistory.x);
                cornerHigh.y = Math.max(cornerHigh.y, rainPositionHistory.y);

                if (rainPositionHistory.value > 0) {
                    return true;
                }
            }
            return false;
        };
        const filteredRains = this.rainHistories.filter(v => partOfGaugesAreaAndInThePeriod(v))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        // const cumulRains = filteredRains.map(ph =>
        //    new PositionHistory(ph.id, ph.date, ph.x, ph.y, ph.value / 12, ph.valueFromRain, ph.valueFromGauge));
        this.filteredRainHistories = filteredRains;

        if (!cornerLow) {
            cornerLow = new Position(0, 0);
        }
        if (!cornerHigh) {
            cornerHigh = new Position(0, 0);
        }

        const center = new Position(
            Math.round((cornerHigh.x + cornerLow.x) / (2 * this.roundScale)),
            Math.round((cornerHigh.y + cornerLow.y) / (2 * this.roundScale)));

        // on each period, store gauge history related to rain values area
        const smallZoneWidth = SpeedMatrix.DEFAULT_ZONE_RANGE;
        const expectedRangeLength = Math.pow(2 * (this.rangeGaugeLarge / this.roundScale) + 1, 2);
        const linkedGaugeAndRainHistories: PositionHistory[][] = [];
        for (let period = -1; period < periodCount - 1; period++) {
            const periodBeginTime = dateTime - (period + 1) * periodLength * 60000;
            const periodEndTime = dateTime - period * periodLength * 60000;

            const gaugeHistoryInThePeriod = this.filteredGaugeHistories.filter(gaugeHistory => {
                const time = gaugeHistory.date.getTime();
                const inside = periodBeginTime <= time && time < periodEndTime;
                //  console.log('gauge?', inside, new Date(periodBeginTime).toISOString(), '<=',
                //    new Date(time).toISOString(), '<', new Date(periodEndTime).toISOString());
                return inside;
            });

            const rainHistoryInThePeriod = this.filteredRainHistories.filter(rainHistory => {
                const time = rainHistory.date.getTime();
                const inside = periodBeginTime <= time && time < periodEndTime;
                //  console.log('rain?', inside, new Date(periodBeginTime).toISOString(), '<=',
                //      new Date(time).toISOString(), '<', new Date(periodEndTime).toISOString());
                return inside;
            });

            const histories = [];
            gaugeHistoryInThePeriod.forEach(positionHistory => {

                let countGoodValue = 0;
                const relatedRains = rainHistoryInThePeriod.filter(g => {
                    return SpeedComputing.isIn(this.rangeGaugeLarge, positionHistory, g, this.roundScale);
                });

                if (expectedRangeLength !== relatedRains.length) {
                    // console.warn('>> raain-quality ### Decrease trustedIndicator because not expected length: ',
                    //  expectedRangeLength, relatedRains.length);
                    trustedIndicator = trustedIndicator * 0.99;
                }

                for (const relatedRain of relatedRains) {
                    const gaugeValue = Number.EPSILON + positionHistory.value;
                    const rainValue = Number.EPSILON + relatedRain.value;
                    const value = gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue;
                    if ((1 - value) < SpeedComputing.FILTER_RATIO) {
                        countGoodValue++;
                    }
                }

                for (const relatedRain of relatedRains) {
                    const gaugeValue = Number.EPSILON + positionHistory.value;
                    const rainValue = Number.EPSILON + relatedRain.value;
                    const value = gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue;
                    if ((1 - value) < SpeedComputing.FILTER_RATIO) {
                        const weightValue = (countGoodValue ? value / countGoodValue : value)
                            * Math.pow(this.rangeGaugeLarge * 2 / this.roundScale, 2);
                        histories.push(new PositionHistory(positionHistory.id,
                            relatedRain.date,
                            Math.round((relatedRain.x - positionHistory.x) / this.roundScale),
                            Math.round((relatedRain.y - positionHistory.y) / this.roundScale),
                            weightValue, gaugeValue, rainValue));
                    }
                }
            });
            linkedGaugeAndRainHistories.push(histories);
        }

        const lengths = linkedGaugeAndRainHistories.map(a => a.length);
        for (let i = lengths.length - 1; i > 0; i--) {
            if (lengths[i] === 0) {
                linkedGaugeAndRainHistories.splice(i, 1);
            }
        }

        if (linkedGaugeAndRainHistories.length < 3) {
            console.warn('>> raain-quality ### Not trusted speed quality, periods are inconsistent: ' + lengths);
            trustedIndicator = trustedIndicator * 0.5;
        }

        // TODO if (countGoodValuesForAllPeriodsAndGauges < 30) {
        //    trustedIndicator = trustedIndicator * 0.5;
        //    smallZoneWidth = smallZoneWidth * 2;
        // }

        const range = this.rangeGaugeLarge / this.roundScale;
        const flattenPositionRange = {xMin: -range, xMax: range, yMin: -range, yMax: range};

        return new SpeedMatrix(linkedGaugeAndRainHistories, center, smallZoneWidth, this, trustedIndicator, flattenPositionRange);
    }

    getGaugePosition(id: string): PositionHistory {
        const found = this.filteredGaugeHistories.filter(h => h.id === id);
        if (found.length > 0) {
            return found[0];
        }

        console.error('>> raain-quality ### cannot getGaugePosition for id ', id);
        return null;
    }

    getRainPosition(gaugePosition: Position, speed: { x: number, y: number }): PositionHistory {
        const found = this.filteredRainHistories.filter(h =>
            QualityTools.roundLatLng(h.x) === QualityTools.roundLatLng(gaugePosition.x + (speed.x * this.roundScale))
            &&
            QualityTools.roundLatLng(h.y) === QualityTools.roundLatLng(gaugePosition.y + (speed.y * this.roundScale))
        );
        if (found.length > 0) {
            return found[0];
        }
        return null;
    }

    getRelativeSpeed(speed: { x: number, y: number }): { x: number, y: number } {
        speed.x = this.roundScale * speed.x;
        speed.y = this.roundScale * speed.y;
        return speed;
    }

}
