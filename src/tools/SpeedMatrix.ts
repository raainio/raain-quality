import {PositionHistory} from '../history/PositionHistory';
import {Position} from './Position';
import {CartesianValue, QualityPoint} from 'raain-model';
import {PositionValue} from './PositionValue';
import {SpeedComputing} from './SpeedComputing';

export class SpeedMatrix {

    protected flattenPositionHistory: number[][];
    protected flattenPositionRange: { xMin: number, xMax: number, yMin: number, yMax: number };
    protected zoneCenter: Position;
    protected qualityPoints: QualityPoint[];

    constructor(
        protected periods: PositionHistory[][],
        protected center: Position,
        protected zoneRange: number = 1,
        private speedComputing: SpeedComputing = null,
    ) {
    }

    public static computeQualityIndicator(points: QualityPoint[]): number {
        let indicator = 0;
        for (const point of points) {
            indicator += Math.abs(point.rainCartesianValue?.value - point.gaugeCartesianValue?.value);
        }
        if (points.length > 0) {
            indicator = indicator / points.length;
        }

        return indicator;
    }

    renderFlatten(options: { square: boolean } = {square: true}): PositionValue[] {

        const positionMatrix = this.buildFlatten();
        if (positionMatrix.length === 0) {
            return [];
        }

        let maxValue = 0;
        const positionHistories = [];
        for (const [iX, posX] of positionMatrix.entries()) {
            for (const [iY, value] of posX.entries()) {
                const x = iX + this.flattenPositionRange.xMin;
                const y = iY + this.flattenPositionRange.yMin;
                positionHistories.push(new PositionValue(x, y, value));
                maxValue = Math.max(maxValue, value);
                if (maxValue === value) {
                    this.zoneCenter = new Position(x, y);
                }
            }
        }

        if (options.square) {
            for (let x = -this.zoneRange; x <= this.zoneRange; x++) {
                for (let y = -this.zoneRange; y <= this.zoneRange; y++) {
                    positionHistories.forEach(p => {
                        if (p.x === x && p.y === y) {
                            p.value = maxValue;
                        }
                    });
                }
            }
        }

        return positionHistories;
    }

    getGaugeIdRelatedValues(id: string): QualityPoint {
        if (this.qualityPoints) {
            const points = this.qualityPoints.filter(p => p.gaugeId === id);
            if (points.length === 1) {
                return points[0];
            }
        }

        let qualityPoint, speed;
        if (!this.zoneCenter) {
            this.renderFlatten({square: false});
        }

        const maxPositionHistories = this.buildFlatten();
        if (maxPositionHistories.length === 0) {
            return undefined;
        }

        speed = {x: 0, y: 0};
        let sumValueOfGauge = 0,
            sumValueOfRain = 0,
            firstDateFound;
        for (const period of this.periods) {
            const samePositionAndSameId = period.filter(p => {
                const sameId = p.id === id;
                const samePos = this.zoneCenter.x === p.x && this.zoneCenter.y === p.y;
                return sameId && samePos;
            });
            for (const gh of samePositionAndSameId) {
                sumValueOfGauge += gh.valueFromGauge;
                sumValueOfRain += gh.valueFromRain;
                speed.x = gh.x;
                speed.y = gh.y;
                if (!firstDateFound) {
                    firstDateFound = gh.date;
                }
            }
        }

        let gaugeLat, gaugeLng, rainLat, rainLng, firstGaugeDateFound;
        let firstRainDateFound = firstDateFound;
        if (this.speedComputing) {
            const gaugePosition = this.speedComputing.getGaugePosition(id);
            gaugeLat = gaugePosition?.x;
            gaugeLng = gaugePosition?.y;
            firstGaugeDateFound = gaugePosition?.date;
            const rainPosition = this.speedComputing.getRainPosition(gaugePosition, speed);
            rainLat = rainPosition?.x;
            rainLng = rainPosition?.y;
            firstRainDateFound = rainPosition?.date;
            speed = this.speedComputing.getRelativeSpeed(speed);
        }

        qualityPoint = new QualityPoint(id, firstGaugeDateFound, firstRainDateFound,
            new CartesianValue(sumValueOfGauge, gaugeLat, gaugeLng),
            new CartesianValue(sumValueOfRain, rainLat, rainLng),
            speed);

        return qualityPoint;
    }

    getQualityPoints(): QualityPoint[] {
        if (this.qualityPoints) {
            return this.qualityPoints;
        }

        // find all gauges
        const gaugeIds = [];
        this.periods[0].forEach(p => {
            if (gaugeIds.indexOf(p.id) < 0) {
                gaugeIds.push(p.id);
            }
        });

        // find all qualityPoints
        this.qualityPoints = [];
        for (const gaugeId of gaugeIds) {
            const result = this.getGaugeIdRelatedValues(gaugeId);
            this.qualityPoints.push(result);
        }

        return this.qualityPoints;
    }

    toJSON() {
        return {
            flattenPositionHistory: this.flattenPositionHistory,
            flattenPositionRange: this.flattenPositionRange,
            qualityPoints: this.qualityPoints,
            zoneCenter: this.zoneCenter,
            zoneRange: this.zoneRange,
            periods: this.periods,
            center: this.center,
        };
    }

    merge(speedMatrix: SpeedMatrix): SpeedMatrix {
        if (this.center.x !== speedMatrix.center.x || this.center.y !== speedMatrix.center.y) {
            console.warn('impossible to merge speedMatrix, not the same center');
            return this;
        }

        this.periods = this.mergeConcat(this.periods, speedMatrix.periods);

        // needs a re-computation
        this.flattenPositionHistory = null;
        this.flattenPositionRange = null;
        this.qualityPoints = null;
        this.zoneCenter = null;
        return this;
    }

    getMaxRain(): number {
        const qualityPoints = this.getQualityPoints();
        let max = -1;
        qualityPoints.forEach(p => max = Math.max(max, p.rainCartesianValue.value));
        return max;
    }

    getMaxGauge(): number {
        const qualityPoints = this.getQualityPoints();
        let max = -1;
        qualityPoints.forEach(p => max = Math.max(max, p.gaugeCartesianValue.value));
        return max;
    }

    protected mergeStillComputed(v1: any, v2: any): any {
        if (!v1 && !v2) {
            return undefined;
        }
        if (!v1) {
            return v2;
        }
        if (!v2) {
            return v1;
        }
        return null;
    }

    protected mergeConcat(a1: Array<any>, a2: Array<any>): Array<any> {
        const stillComputed = this.mergeStillComputed(a1, a2);
        if (stillComputed === null) {
            return a1.concat(a2);
        }
        return stillComputed;
    }

    protected findMax(oldValue, newValue) {
        if (!oldValue || Math.max(oldValue, newValue) === newValue) {
            return newValue;
        }
        return oldValue;
    }

    protected findMin(oldValue, newValue) {
        if (!oldValue || Math.min(oldValue, newValue) === newValue) {
            return newValue;
        }
        return oldValue;
    }

    protected buildFlatten(): number[][] {
        if (this.flattenPositionHistory) {
            return this.flattenPositionHistory;
        }

        let xMax, xMin, yMax, yMin;
        for (const period of this.periods) {
            for (const position of period) {
                xMax = this.findMax(xMax, position.x);
                xMin = this.findMin(xMin, position.x);
                yMax = this.findMax(yMax, position.y);
                yMin = this.findMin(yMin, position.y);
            }
        }
        this.flattenPositionRange = {xMax, xMin, yMax, yMin};

        this.flattenPositionHistory = [];
        for (let x = 0; x <= xMax - xMin; x++) {
            this.flattenPositionHistory.push(Array(yMax - yMin + 1).fill(0));
        }

        // same position => add value
        for (const period of this.periods) {
            for (const position of period) {
                const positionX = position.x - xMin;
                const positionY = position.y - yMin;
                this.flattenPositionHistory[positionX][positionY] += position.value;
            }
        }

        return this.flattenPositionHistory;
    }

}
