import {PositionHistory} from '../history/PositionHistory';
import {SpeedMatrix} from './SpeedMatrix';
import {Position} from './Position';
import {CartesianQuality} from '../CartesianQuality';
import {QualityTools} from './QualityTools';

export class SpeedComputing {

    private static FILTER_RATIO = 0.05;  // <=== TODO PLAY
    private static GAUGE_I = [0, 2.4, 4.8, 7.2, 9.6, 12.0, 13.2, 14.4, 15.6, 16.8, 18.0, 19.2, 20.4,
        21.6, 22.8, 24.0, 25.2, 26.4, 27.6, 28.8, 30.0, 31.2, 32.4, 33.6, 34.8, 36.0, 37.2, 38.4, 39.6,
        40.8, 42.0, 43.2, 44.4, 45.6, 46.8, 48.0, 49.2, 50.4, 51.6, 52.8, 54.0, 55.2, 56.4, 57.6, 58.8,
        60.0, 61.2, 62.4, 63.6, 64.8, 66.0, 67.2, 68.4, 69.6, 70.8, 72.0, 73.2, 74.4, 75.6, 76.8, 78.0,
        79.2, 80.4, 81.6, 82.8, 84.0, 85.2, 86.4, 87.6, 88.8, 90.0, 91.2, 92.4, 93.6, 94.8, 96.0, 97.2,
        98.4, 99.6, 100.8, 102.0, 103.2, 104.4, 105.6, 106.8, 108.0, 109.2, 110.4, 111.6, 112.8, 114.0,
        115.2, 116.4, 117.6, 118.8, 120.0, 121.2, 122.4, 123.6, 124.8, 126.0, 127.2, 128.4, 129.6, 130.8,
        132.0, 133.2, 134.4, 135.6, 136.8, 138.0, 139.2, 140.4, 141.6, 142.8, 144.0, 145.2, 146.4, 147.6,
        148.8, 150.0, 151.2, 152.4, 153.6, 154.8, 156.0, 157.2, 158.4, 159.6, 160.8, 162.0, 163.2, 164.4,
        165.6, 166.8, 168.0, 169.2, 170.4, 171.6, 172.8, 174.0, 175.2, 176.4, 177.6, 178.8, 180.0, 181.2,
        182.4, 183.6, 184.8, 186.0, 187.2, 188.4, 189.6, 190.8, 192.0, 193.2, 194.4, 195.6, 196.8
    ];

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

    static isIn(rangeGaugeLarge: number, valueXY: { x: number, y: number }, compareXY: Position, scale: number): boolean {

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

    private static GetIntensity(v) {
        // return Number.EPSILON + v;
        const closest = SpeedComputing.GAUGE_I.reduce((prev, curr) => {
            return (Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev);
        });
        return closest;
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
        const GAUGE_FLOW_RATIO = 12;

        // 1) filter gauge history non-null values in the period
        const filteredGaugeHistories = this.gaugeHistories
            .filter(g => {
                if (g.value <= 0) {
                    return false;
                }
                const time = g.date.getTime();
                // console.log('filteredGaugeHistories',
                //     new Date(dateTimeMinusXmin).toISOString(), '<=', g.date.toISOString(), '<=', date.toISOString());
                return dateTimeMinusXmin <= time && (time - periodLength * 60000) <= dateTime;
            });
        const filteredGaugesHistoriesDesc = filteredGaugeHistories
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        // const filteredGaugesHistoriesAsc = filteredGaugeHistories
        //    .sort((a, b) => a.date.getTime() - b.date.getTime());

        // const filteredGaugesHistoriesWithoutFirstValues = filteredGaugesHistoriesDesc
        //     .filter((g, index) => {
        //         const sameValues = filteredGaugesHistoriesAsc.filter(ga => ga.id === g.id);
        //         return sameValues[0] !== g;
        //     });

        filteredGaugesHistoriesDesc
            .forEach(g => g.value = g.value * GAUGE_FLOW_RATIO);
        this.filteredGaugeHistories = filteredGaugesHistoriesDesc;

        // 2) filter rain history in the period and near gauges
        let cornerLow, cornerHigh;
        const gaugePositions = Position.uniq(
            this.filteredGaugeHistories.map(positionHistory => new Position(positionHistory.x, positionHistory.y)));
        const partOfGaugesAreaAndInThePeriod = (rainPositionHistory: PositionHistory) => {
            const time = rainPositionHistory.date.getTime();
            // console.log('filteredRainHistories',
            //     new Date(dateTimeMinusXmin).toISOString(), '<=', rainPositionHistory.date.toISOString(), '<=', date.toISOString());
            const inTheLastXmin = dateTimeMinusXmin <= time && time <= dateTime;
            if (!inTheLastXmin) {
                return false;
            }

            const contains = gaugePositions
                .filter(gaugePosition => {
                    return SpeedComputing.isIn(this.rangeGaugeLarge, rainPositionHistory, gaugePosition, this.roundScale);
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
        const filteredRainsAndSorted = this.rainHistories.filter(v => partOfGaugesAreaAndInThePeriod(v))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        this.filteredRainHistories = filteredRainsAndSorted;

        if (!cornerLow) {
            cornerLow = new Position(0, 0);
        }
        if (!cornerHigh) {
            cornerHigh = new Position(0, 0);
        }

        const center = new Position(
            Math.round((cornerHigh.x + cornerLow.x) / (2 * this.roundScale)),
            Math.round((cornerHigh.y + cornerLow.y) / (2 * this.roundScale)));

        // 3) on each period, store gauge history related to rain values area
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
            for (const positionHistory of gaugeHistoryInThePeriod) {

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
                    const gaugeValue = SpeedComputing.GetIntensity(positionHistory.value);
                    const rainValue = SpeedComputing.GetIntensity(relatedRain.value);
                    const value = gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue;
                    if ((1 - value) < SpeedComputing.FILTER_RATIO) {
                        countGoodValue++;
                    }
                }

                for (const relatedRain of relatedRains) {
                    const gaugeValue = SpeedComputing.GetIntensity(positionHistory.value);
                    const rainValue = SpeedComputing.GetIntensity(relatedRain.value);
                    const value = gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue;
                    if ((1 - value) < SpeedComputing.FILTER_RATIO) {
                        const weightValue = (countGoodValue ? value / countGoodValue : value)
                            * Math.pow(this.rangeGaugeLarge * 2 / this.roundScale, 2);
                        histories.push(new PositionHistory(positionHistory.id,
                            relatedRain.date,
                            Math.round((relatedRain.x - positionHistory.x) / this.roundScale),
                            Math.round((relatedRain.y - positionHistory.y) / this.roundScale),
                            weightValue,
                            positionHistory.value / GAUGE_FLOW_RATIO,
                            relatedRain.value));
                    }
                }
            }
            linkedGaugeAndRainHistories.push(histories);
        }

        // 4) build matrix
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
            QualityTools.roundLatLng(h.x, CartesianQuality.DEFAULT_SCALE, true)
            === QualityTools.roundLatLng(gaugePosition.x + (speed.x * this.roundScale), CartesianQuality.DEFAULT_SCALE, true)
            &&
            QualityTools.roundLatLng(h.y, CartesianQuality.DEFAULT_SCALE, true)
            === QualityTools.roundLatLng(gaugePosition.y + (speed.y * this.roundScale), CartesianQuality.DEFAULT_SCALE, true)
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
