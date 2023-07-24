import {PositionHistory} from '../history/PositionHistory';
import {SpeedMatrix} from './SpeedMatrix';
import {Position} from './Position';
import {CartesianQuality} from '../CartesianQuality';

export class SpeedComputing {

    private filteredRainHistories: PositionHistory[];
    private filteredGaugeHistories: PositionHistory[];

    constructor(
        protected rainHistories: PositionHistory[],
        protected gaugeHistories: PositionHistory[],
        private rangeGaugeLarge: number = 0.08,
        private roundScale: number = CartesianQuality.DEFAULT_SCALE,
    ) {
        this.filteredRainHistories = rainHistories;
        this.filteredGaugeHistories = gaugeHistories;
    }

    public computeSpeedMatrix(date: Date,
                              options: {
                                  periodCount: number,
                                  periodMinutes: number,
                              } = {periodCount: 6, periodMinutes: 30}): SpeedMatrix {

        const periodCount = options.periodCount;
        const periodMinutes = options.periodMinutes;

        // filter gauge history in the period
        this.filteredGaugeHistories = this.gaugeHistories.filter(g => {
            const time = g.date.getTime();
            const dateTime = date.getTime();
            const dateTimeMinusXmin = dateTime - periodMinutes * 60000;
            return dateTimeMinusXmin <= time && time <= dateTime;
        }).sort((a, b) => b.date.getTime() - a.date.getTime());

        // filter rain history in the period and near to gauge
        const cornerLow = new Position(0, 0);
        const cornerHigh = new Position(0, 0);
        const partOfGaugesAreaAndInThePeriod = (value: PositionHistory) => {
            cornerLow.x = Math.min(cornerLow.x, value.x);
            cornerLow.y = Math.min(cornerLow.y, value.y);
            cornerHigh.x = Math.max(cornerHigh.x, value.x);
            cornerHigh.y = Math.max(cornerHigh.y, value.y);
            const contains = this.filteredGaugeHistories.filter(g => {
                const inX = (g.x - this.rangeGaugeLarge <= value.x) && (value.x <= g.x + this.rangeGaugeLarge);
                const inY = (g.y - this.rangeGaugeLarge <= value.y) && (value.y <= g.y + this.rangeGaugeLarge);
                const time = value.date.getTime();
                const dateTime = date.getTime();
                const dateTimeMinusXmin = dateTime - periodMinutes * 60000;
                const inTheLastXmin = dateTimeMinusXmin <= time && time <= dateTime;
                return inX && inY && inTheLastXmin;
            });
            return contains.length > 0;
        };
        this.filteredRainHistories = this.rainHistories.filter(v => partOfGaugesAreaAndInThePeriod(v))
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        const center = new Position(
            Math.round((cornerHigh.x + cornerLow.x) / (2 * this.roundScale)),
            Math.round((cornerHigh.y + cornerLow.y) / (2 * this.roundScale)));

        // on each period, store gauge history related to rain values area
        const linkedGaugeAndRainHistories: PositionHistory[][] = [];
        for (let period = 0; period < periodCount; period++) {

            const gaugeHistoryInThePeriod = this.filteredGaugeHistories.filter(gaugeHistory => {
                const time = gaugeHistory.date.getTime();
                const periodBeginTime = date.getTime() - (period + 1) * periodMinutes / periodCount * 60000;
                const periodEndTime = date.getTime() - period * periodMinutes / periodCount * 60000;
                return periodBeginTime <= time && time < periodEndTime;
            });

            const rainHistoryInThePeriod = this.filteredRainHistories.filter(rainHistory => {
                const time = rainHistory.date.getTime();
                const periodBeginTime = date.getTime() - (period + 1) * periodMinutes / periodCount * 60000;
                const periodEndTime = date.getTime() - (period) * periodMinutes / periodCount * 60000;
                return periodBeginTime <= time && time < periodEndTime;
            });

            const histories = [];
            gaugeHistoryInThePeriod.forEach(positionHistory => {
                const relatedRains = rainHistoryInThePeriod.filter(g => {
                    const inX = (g.x - this.rangeGaugeLarge <= positionHistory.x) && (positionHistory.x <= g.x + this.rangeGaugeLarge);
                    const inY = (g.y - this.rangeGaugeLarge <= positionHistory.y) && (positionHistory.y <= g.y + this.rangeGaugeLarge);
                    return inX && inY;
                });
                for (const relatedRain of relatedRains) {
                    const gaugeValue = Number.EPSILON + positionHistory.value;
                    const rainValue = Number.EPSILON + relatedRain.value;
                    histories.push(new PositionHistory(positionHistory.id,
                        relatedRain.date,
                        Math.round((relatedRain.x - positionHistory.x) / this.roundScale),
                        Math.round((relatedRain.y - positionHistory.y) / this.roundScale),
                        gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue,
                        gaugeValue, rainValue));
                }
            });
            linkedGaugeAndRainHistories.push(histories);
        }

        for (const each of linkedGaugeAndRainHistories) {
            if (each.length === 0 || each.length !== linkedGaugeAndRainHistories[0].length) {
                console.error('impossible to compute speed quality, periods are inconsistent',
                    linkedGaugeAndRainHistories[0].length, each.length);
                return null;
            }
        }

        return new SpeedMatrix(linkedGaugeAndRainHistories, center, 1, this);
    }

    getGaugePosition(id: string): PositionHistory {
        const found = this.filteredGaugeHistories.filter(h => h.id === id);
        if (found.length > 0) {
            return found[0];
        }
        return null;
    }

    getRainPosition(gaugePosition: Position, speed: { x: number, y: number }): PositionHistory {
        const found = this.filteredRainHistories.filter(h =>
            h.x === gaugePosition.x + (speed.x * this.roundScale) && h.y === gaugePosition.y + (speed.y * this.roundScale)
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
