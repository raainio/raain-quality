import {SpeedComparator} from './SpeedComparator';
import {PositionHistory} from '../history/PositionHistory';

export class SpeedComputing {

    private filteredRainHistories: PositionHistory[];

    constructor(
        protected rainHistories: PositionHistory[],
        protected gaugeHistories: PositionHistory[],
        protected distanceRatio: number = 1,
        private rangeGaugeLarge: number = 6,
        private rangeGaugeClose: number = 2
    ) {
        this.filteredRainHistories = rainHistories;
    }

    public computeSpeed(): SpeedComparator {

        // filter to use only what is needed
        const partOfGaugesArea = (value: PositionHistory) => {
            const contains = this.gaugeHistories.filter(g => {
                const inX = (g.x - this.rangeGaugeLarge <= value.x) && (value.x <= g.x + this.rangeGaugeLarge);
                const inY = (g.y - this.rangeGaugeLarge <= value.y) && (value.y <= g.y + this.rangeGaugeLarge);
                return inX && inY;
            });
            return contains.length > 0;
        };
        this.filteredRainHistories = this.filteredRainHistories.filter(v => {
            return partOfGaugesArea(v);
        });

        // compute most representative position on map
        const speedComparator = this.speedOnEachLargeArea();

        // convert position to speed (needs time diff)
        let diffTimeBetweenGaugeAndRain = 0;
        if (this.gaugeHistories.length > 0 && this.rainHistories.length > 0) {
            const cartesianRainHistory = this.rainHistories[0];
            const cartesianGaugeHistory = this.gaugeHistories[0];
            diffTimeBetweenGaugeAndRain = cartesianGaugeHistory.date.getTime() - cartesianRainHistory.date.getTime();
        }
        speedComparator.convertSpeed(this.distanceRatio, diffTimeBetweenGaugeAndRain);

        return speedComparator;
    }

    protected speedOnEachLargeArea(): SpeedComparator {

        const speedComparator = new SpeedComparator();
        speedComparator.positionGeoRatio = this.distanceRatio;
        speedComparator.deltaSum = -1;
        speedComparator.distanceSum = -1;

        for (let x = 0 - this.rangeGaugeLarge; x <= this.rangeGaugeLarge; x++) {
            for (let y = 0 - this.rangeGaugeLarge; y <= this.rangeGaugeLarge; y++) {

                let bestSpeedComparator = new SpeedComparator(speedComparator.deltaSum, speedComparator.distanceSum, x, y);
                bestSpeedComparator = this.getTheBestSpeed(speedComparator, bestSpeedComparator);

                speedComparator.xDiff = bestSpeedComparator.xDiff;
                speedComparator.yDiff = bestSpeedComparator.yDiff;
                speedComparator.deltaSum = bestSpeedComparator.deltaSum;
                speedComparator.distanceSum = bestSpeedComparator.distanceSum;
            }
        }

        return speedComparator;
    }

    protected getTheBestSpeed(legacySpeed: SpeedComparator, challengedSpeed: SpeedComparator): SpeedComparator {

        const gaugesSpeed: SpeedComparator[] = [];
        for (const gaugeHistory of this.gaugeHistories) {

            let bestSpeedForGauge;
            let minDiffValueForGauge = null;

            for (let x = 0 - this.rangeGaugeClose; (x <= this.rangeGaugeClose); x++) {
                for (let y = 0 - this.rangeGaugeClose; (y <= this.rangeGaugeClose); y++) {

                    const speedBetweenCenter = new SpeedComparator(0, 0,
                        x + challengedSpeed.xDiff, y + challengedSpeed.yDiff);
                    const rainHistory = this.getAssociatedRainHistory(gaugeHistory, speedBetweenCenter);

                    if (rainHistory) {
                        const diffValue = Math.abs(rainHistory.value - gaugeHistory.value);

                        const isTheBestCloseAreaForNow = minDiffValueForGauge === null || minDiffValueForGauge > diffValue;

                        if (isTheBestCloseAreaForNow) {
                            if (!bestSpeedForGauge) {
                                bestSpeedForGauge = new SpeedComparator();
                            }

                            minDiffValueForGauge = diffValue;
                            bestSpeedForGauge.xDiff = challengedSpeed.xDiff;
                            bestSpeedForGauge.yDiff = challengedSpeed.yDiff;
                            bestSpeedForGauge.deltaSum = diffValue;
                            bestSpeedForGauge.distanceSum = Math.abs(x) + Math.abs(y);
                        }
                    }
                }
            }

            if (bestSpeedForGauge) {
                gaugesSpeed.push(bestSpeedForGauge);
            }
        }

        let deltaSum = 0;
        let distanceSum = 0;
        for (const gaugeSpeed of gaugesSpeed) {
            deltaSum += gaugeSpeed.deltaSum;
            distanceSum += gaugeSpeed.distanceSum;// gaugeSpeed.getDistanceBetweenZero();
        }

        const isTheBestForNow = challengedSpeed.deltaSum < 0 || challengedSpeed.deltaSum > deltaSum
            || (challengedSpeed.deltaSum === deltaSum && challengedSpeed.distanceSum > distanceSum);

        if (gaugesSpeed.length > 0 && isTheBestForNow) {
            challengedSpeed.deltaSum = deltaSum;
            challengedSpeed.distanceSum = distanceSum;
            return challengedSpeed;
        }

        return legacySpeed;
    }


    protected getAssociatedRainHistory(gaugeHistory: PositionHistory,
                                       speed: SpeedComparator): PositionHistory {

        const filtered = this.filteredRainHistories.filter(c => {
            const sameX = c.x === speed.xDiff + gaugeHistory.x;
            const sameY = c.y === speed.yDiff + gaugeHistory.y;
            return sameX && sameY;
        });

        if (!filtered || filtered.length !== 1) {
            return null;
        }

        return filtered[0];
    }


}