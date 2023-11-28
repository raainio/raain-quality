import {PositionHistory} from '../history/PositionHistory';
import {SpeedMatrix} from './SpeedMatrix';
import {Position} from './Position';
import {CartesianQuality} from '../CartesianQuality';
import {LatLng} from './LatLng';
import {Converter} from './Converter';

export class SpeedComputing {

    private static FILTER_RATIO = 0.05;  // <=== TODO PLAY
    private static GAUGE_FLOW_RATIO = 12;
    /**
     * @deprecated
     */
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
    private dateTime: number;

    constructor(
        protected rainHistories: PositionHistory[],
        protected gaugeHistories: PositionHistory[],
        private rangeGaugeLarge: number = SpeedMatrix.DEFAULT_MATRIX_RANGE,
        private cartesianPixelWidth: LatLng = new LatLng(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE)
    ) {
        this.filteredRainHistories = rainHistories;
        this.filteredGaugeHistories = gaugeHistories;
    }

    static IsIn(p: { x: number, y: number } | Position,
                pToCompare: { x: number, y: number } | Position,
                rangeGaugeLarge: number,
                scale: Position): boolean {

        const xPotentialWidth = rangeGaugeLarge * scale.x;
        const yPotentialWidth = rangeGaugeLarge * scale.y;

        const xBefore = Math.round((pToCompare.x - xPotentialWidth) / scale.x);
        const xAfter = Math.round((pToCompare.x + xPotentialWidth) / scale.x);
        const yBefore = Math.round((pToCompare.y - yPotentialWidth) / scale.y);
        const yAfter = Math.round((pToCompare.y + yPotentialWidth) / scale.y);

        const xValue = Math.round((p.x) / scale.x);
        const yValue = Math.round((p.y) / scale.y);

        const inX = (xBefore <= xValue) && (xValue <= xAfter);
        const inY = (yBefore <= yValue) && (yValue <= yAfter);

        return inX && inY;
    }

    static IsInStrict(p: { x: number, y: number } | Position,
                      pToCompare: { x: number, y: number } | Position,
                      scale: Position): boolean {

        const xBefore = Math.round((pToCompare.x) / scale.x);
        const xAfter = Math.round((pToCompare.x + scale.x) / scale.x);
        const yBefore = Math.round((pToCompare.y) / scale.y);
        const yAfter = Math.round((pToCompare.y + scale.y) / scale.y);

        const xValue = Math.round((p.x) / scale.x);
        const yValue = Math.round((p.y) / scale.y);

        const inX = (xBefore <= xValue) && (xValue < xAfter);
        const inY = (yBefore <= yValue) && (yValue < yAfter);

        return inX && inY;
    }

    static ComputeLinkedPositionHistories(gaugeHistoryInThePeriod: PositionHistory[],
                                          rainHistoryInThePeriod: PositionHistory[],
                                          rangeGaugeLarge: number, roundScale: Position,
    ): PositionHistory[] {

        const histories: PositionHistory[] = [];
        for (const gaugePositionHistory of gaugeHistoryInThePeriod) {

            const gaugeValue = gaugePositionHistory.value;

            const rainHistoryInThePeriodAndAroundGauge = rainHistoryInThePeriod.filter(rph => {
                return SpeedComputing.IsIn(rph, gaugePositionHistory, rangeGaugeLarge, roundScale);
            });

            const relatedSolutions = SpeedComputing.ComputeRelatedSolutions(gaugePositionHistory,
                rainHistoryInThePeriodAndAroundGauge, rangeGaugeLarge, roundScale);

            for (const relatedSolution of relatedSolutions) {
                const weightValue = 1 / relatedSolutions.length;
                for (const rainHistory of relatedSolution.positions) {

                    const history = new Position((rainHistory.x - gaugePositionHistory.x) / roundScale.x,
                        (rainHistory.y - gaugePositionHistory.y) / roundScale.y);
                    history.setPrecision(0);

                    const alreadyExist = histories
                        .filter(ph => ph.id === gaugePositionHistory.id && history.samePosition(ph)).length > 0;
                    if (!alreadyExist) {
                        histories.push(new PositionHistory(gaugePositionHistory.id,
                            rainHistory.date,
                            history.x,
                            history.y,
                            weightValue,
                            gaugeValue / SpeedComputing.GAUGE_FLOW_RATIO,
                            rainHistory.value));
                    }
                }
            }
        }

        return histories;
    }

    static ComputeLinkedPositionHistoriesV1(gaugeHistoryInThePeriod: PositionHistory[],
                                            rainHistoryInThePeriod: PositionHistory[],
                                            rangeGaugeLarge: number,
                                            roundScale: Position): PositionHistory[] {

        const histories: PositionHistory[] = [];
        for (const gaugePositionHistory of gaugeHistoryInThePeriod) {

            let countGoodValue = 0;
            const relatedRains = rainHistoryInThePeriod.filter(rph => {
                return SpeedComputing.IsIn(rph, gaugePositionHistory, rangeGaugeLarge, roundScale);
            });

            // if (expectedRangeLength !== relatedRains.length) {
            // console.warn('>> raain-quality ### Decrease trustedTechnicalIndicator because not expected length: ',
            //  expectedRangeLength, relatedRains.length);
            // trustedTechnicalIndicator = trustedTechnicalIndicator * 0.99;
            // }

            for (const relatedRain of relatedRains) {
                const gaugeValue = SpeedComputing.GetIntensity(gaugePositionHistory.value);
                const rainValue = SpeedComputing.GetIntensity(relatedRain.value);
                const value = gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue;
                if ((1 - value) < SpeedComputing.FILTER_RATIO) {
                    countGoodValue++;
                }
            }

            for (const relatedRain of relatedRains) {
                const gaugeValue = SpeedComputing.GetIntensity(gaugePositionHistory.value);
                const rainValue = SpeedComputing.GetIntensity(relatedRain.value);
                const value = gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue;
                if ((1 - value) < SpeedComputing.FILTER_RATIO) {
                    const weightValue = (countGoodValue ? value / countGoodValue : value);
                    console.log('rainValue', rainValue, 'gaugeValue', gaugeValue, 'weightValue', weightValue);

                    const historyX = Math.round((relatedRain.x - gaugePositionHistory.x) / roundScale.x);
                    const historyY = Math.round((relatedRain.y - gaugePositionHistory.y) / roundScale.y);

                    const alreadyExist = histories.filter(ph => ph.x === historyX && ph.y === historyY).length > 0;
                    if (alreadyExist) {
                        console.log('yeaahh??', histories.filter(ph => ph.x === historyX && ph.y === historyY))
                    } else {
                        histories.push(new PositionHistory(gaugePositionHistory.id,
                            relatedRain.date,
                            historyX,
                            historyY,
                            weightValue,
                            gaugePositionHistory.value / SpeedComputing.GAUGE_FLOW_RATIO,
                            relatedRain.value));
                    }
                }
            }
        }

        return histories;
    }

    static ComputeRelatedSolutions(gaugePositionHistory: PositionHistory,
                                   rainHistoryInThePeriodAndAroundGauge: PositionHistory[],
                                   rangeGaugeLarge: number,
                                   roundScale: Position
    ): { positions: PositionHistory[], weightValue: number }[] {

        if (rainHistoryInThePeriodAndAroundGauge.length === 0) {
            return [];
        }

        const xWidth = rangeGaugeLarge * roundScale.x;
        const yWidth = rangeGaugeLarge * roundScale.y;

        const relatedSolutions: { positions: PositionHistory[], weightValue: number }[] = [];
        for (let x = -xWidth; x <= xWidth; x += roundScale.x) {
            for (let y = -yWidth; y <= yWidth; y += roundScale.y) {

                const xy = new Position(x, y);
                xy.setPrecision(12);
                x = xy.x;
                y = xy.y;

                // const isOnTheBorders = xy.x === -xWidth || xy.y === -yWidth || xy.x === xWidth || xy.y === yWidth;
                // if (!isOnTheBorders) continue;

                const position = new Position(xy.x + gaugePositionHistory.x, xy.y + gaugePositionHistory.y);
                position.setPrecision(12);

                // const pixelsInThePath = rainHistoryInThePeriodAndAroundGauge
                //    .filter(p => SpeedComputing.IsInThePath(p, gaugePositionHistory, position, roundScale));

                // const p1p2Done: { p1: PositionHistory, p2: PositionHistory }[] = [];
                // for (const p1 of pixelsInThePath) {
                //   const p2 = p1; // TODO later any combination in the path ? for (const p2 of pixelsInThePath) {

                //    const alreadyDone = p1p2Done
                //        .filter(px => (px.p1 === p1 && px.p2 === p2) || (px.p2 === p1 && px.p1 === p2)).length > 0;
                //    if (alreadyDone) continue;
                //    p1p2Done.push({p1, p2});

                //      const pixelsIsInThePathBetweenP1P2 = pixelsInThePath
                //          .filter(p => SpeedComputing.IsInThePath(p, p1, p2, roundScale));

                //    const weightValue = pixelsIsInThePathBetweenP1P2
                //        .reduce((prev, p) => p.value + prev, 0);

                const pixels = rainHistoryInThePeriodAndAroundGauge
                    .filter(p => SpeedComputing.IsInStrict(p, position, roundScale));

                if (pixels.length > 1) {
                    console.warn('error ?', pixels);
                }

                const gaugeValue = gaugePositionHistory.value; // SpeedComputing.GetIntensity(
                const rainValue = pixels[0] ? pixels[0].value : 0;

                const ratioInMatrix = gaugeValue > rainValue ? rainValue / gaugeValue : gaugeValue / rainValue;

                if (1 - ratioInMatrix < SpeedComputing.FILTER_RATIO && pixels[0]) {
                    relatedSolutions.push({positions: [pixels[0]], weightValue: ratioInMatrix});
                }
            }
        }

        return relatedSolutions.sort((s1, s2) => s2.weightValue - s1.weightValue);
    }

    static IsInThePath(p: Position, p1: Position, p2: Position, roundScale: Position): boolean {

        const maxX = Math.max(p1.x, p2.x);
        const maxY = Math.max(p1.y, p2.y);
        const minX = Math.min(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);

        return (minX <= p.x && minY <= p.y) && (p.x <= maxX && p.y <= maxY);
    }

    /**
     * @deprecated
     */
    private static GetIntensity(v) {
        // TODO bypass ? return Number.EPSILON + v;
        return SpeedComputing.GAUGE_I.reduce((prev, curr) => {
            return (Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev);
        });
    }

    public computeSpeedMatrix(date: Date,
                              options: {
                                  periodCount: number,
                                  periodMinutes: number,
                              } = {periodCount: 6, periodMinutes: 30}): SpeedMatrix {

        const periodCount = options.periodCount;
        const periodMinutes = options.periodMinutes;
        this.dateTime = date.getTime();
        const dateTimeMinusXmin = this.dateTime - periodMinutes * 60000;
        const periodLength = Math.round(options.periodMinutes / options.periodCount);
        const trustedTechnicalIndicator = SpeedMatrix.DEFAULT_TRUSTED_INDICATOR;
        const roundScale: Position = Converter.MapLatLngToPosition(this.cartesianPixelWidth);

        // 1) filter gauge history non-null values in the period
        this.filteredGaugeHistories = this.computeFilteredGaugeHistories(this.dateTime, periodLength);

        // 2) filter rain history in the period and near gauges
        const gaugePositions = Position.uniq(
            this.filteredGaugeHistories.map(positionHistory => new Position(positionHistory.x, positionHistory.y)));
        const {
            filteredRainsAndSorted,
            center
        } = this.computeFilteredRainHistories(gaugePositions, this.dateTime, periodLength, roundScale);
        this.filteredRainHistories = filteredRainsAndSorted;

        // 3) on each period, link gauge history and rain values area
        const linkedGaugeAndRainHistories = this.getLinkedGaugeAndRainHistories(periodCount, periodLength, this.dateTime, roundScale);

        // 4) build matrix
        const lengths = linkedGaugeAndRainHistories.map(a => a.length);
        for (let i = lengths.length - 1; i > 0; i--) {
            if (lengths[i] === 0) {
                linkedGaugeAndRainHistories.splice(i, 1);
            }
        }

        // if (linkedGaugeAndRainHistories.length < 3) {
        //     console.warn('>> raain-quality ### Not trusted speed quality, periods are inconsistent: ' + lengths);
        //     trustedTechnicalIndicator = trustedTechnicalIndicator * 0.5;
        // }

        // TODO if (countGoodValuesForAllPeriodsAndGauges < 30) {
        //    trustedTechnicalIndicator = trustedTechnicalIndicator * 0.5;
        //    smallZoneWidth = smallZoneWidth * 2;
        // }

        const range = this.rangeGaugeLarge;
        const flattenPositionRange = {xMin: -range, xMax: range, yMin: -range, yMax: range};

        return new SpeedMatrix(linkedGaugeAndRainHistories, center,
            SpeedMatrix.DEFAULT_ZONE_RANGE, this, trustedTechnicalIndicator, flattenPositionRange);
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
        const roundScale = Converter.MapLatLngToPosition(this.cartesianPixelWidth);
        const gaugeTranslated = new Position(gaugePosition.x + (speed.x * roundScale.x),
            gaugePosition.y + (speed.y * roundScale.y));

        const found = this.rainHistories
            .filter(h => {
                return h.date.getTime() === this.dateTime && SpeedComputing.IsInStrict(gaugeTranslated, h, roundScale);
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        if (found.length > 0) {
            return found[0];
        }
        return null;
    }

    getRelativeSpeed(speed: { x: number, y: number }): { x: number, y: number } {
        const roundScale = Converter.MapLatLngToPosition(this.cartesianPixelWidth);

        speed.x = roundScale.x * speed.x;
        speed.y = roundScale.y * speed.y;
        return speed;
    }

    getLinkedGaugeAndRainHistories(periodCount: number, periodLength: number, dateTime: number, roundScale: Position): PositionHistory[][] {

        // const expectedRangeLength = Math.pow(2 * (this.rangeGaugeLarge / CartesianQuality.DEFAULT_SCALE) + 1, 2);
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

            const histories = SpeedComputing.ComputeLinkedPositionHistories(gaugeHistoryInThePeriod, rainHistoryInThePeriod,
                this.rangeGaugeLarge, roundScale);
            linkedGaugeAndRainHistories.push(histories);
        }

        return linkedGaugeAndRainHistories;
    }

    private computeFilteredGaugeHistories(dateTime: number, periodInMinutes: number): PositionHistory[] {
        const filteredGaugeHistories = this.gaugeHistories
            .filter(g => {
                if (g.value <= 0) {
                    return false;
                }
                const time = g.date.getTime();
                // console.log('filteredGaugeHistories',
                //     new Date(dateTimeMinusXmin).toISOString(), '<=', g.date.toISOString(), '<=', date.toISOString());
                return dateTime <= time && (time - periodInMinutes * 60000) < dateTime;
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
            .forEach(g => g.value = g.value * SpeedComputing.GAUGE_FLOW_RATIO);
        return filteredGaugesHistoriesDesc;
    }

    private computeFilteredRainHistories(gaugePositions: Position[], dateTime: number, periodInMinutes: number, roundScale: Position): {
        filteredRainsAndSorted: PositionHistory[],
        center: Position
    } {
        let cornerLow, cornerHigh;

        const partOfGaugesAreaAndInThePeriod = (rainPositionHistory: PositionHistory) => {
            const time = rainPositionHistory.date.getTime();
            // console.log('filteredRainHistories',
            //     new Date(dateTimeMinusXmin).toISOString(), '<=', rainPositionHistory.date.toISOString(), '<=', date.toISOString());
            //  const inTheLastXmin = dateTimeMinusXmin <= time && time <= dateTime;
            const inTheLastXmin = dateTime <= time && (time - periodInMinutes * 60000) < dateTime;
            if (!inTheLastXmin) {
                return false;
            }

            const contained = gaugePositions
                .filter(gaugePosition => {
                    return SpeedComputing.IsIn(rainPositionHistory, gaugePosition, this.rangeGaugeLarge, roundScale);
                });

            if (contained.length > 0) {
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
        const filteredRainsAndSorted = this.rainHistories.filter(rph => partOfGaugesAreaAndInThePeriod(rph))
            .sort((a, b) => b.date.getTime() - a.date.getTime());


        if (!cornerLow) {
            cornerLow = new Position(0, 0);
        }
        if (!cornerHigh) {
            cornerHigh = new Position(0, 0);
        }

        const center = new Position(
            Math.round((cornerHigh.x + cornerLow.x) / (2 * roundScale.x)),
            Math.round((cornerHigh.y + cornerLow.y) / (2 * roundScale.y)));

        return {filteredRainsAndSorted, center};
    }
}
