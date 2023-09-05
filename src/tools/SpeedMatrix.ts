import {PositionHistory} from '../history/PositionHistory';
import {Position} from './Position';
import {CartesianValue, QualityPoint} from 'raain-model';
import {PositionValue} from './PositionValue';
import {SpeedComputing} from './SpeedComputing';

export class SpeedMatrix {

    public static DEFAULT_ZONE_RANGE = 2;
    public static DEFAULT_TRUSTED_INDICATOR = 1;
    public static DEFAULT_MATRIX_RANGE = 8;

    protected flattenPositionHistory: number[][];
    protected flattenSpeedPosition: Position;
    protected qualityPoints: QualityPoint[];

    constructor(
        protected periods: PositionHistory[][],
        protected center: Position,
        protected zoneRange: number = SpeedMatrix.DEFAULT_ZONE_RANGE,
        private speedComputing: SpeedComputing = null,
        protected trustedIndicator = SpeedMatrix.DEFAULT_TRUSTED_INDICATOR,
        protected flattenPositionRange: { xMin: number, xMax: number, yMin: number, yMax: number } = {xMin: -8, xMax: 8, yMin: -8, yMax: 8}
    ) {
    }

    public static createFromJson(json: any): SpeedMatrix {
        const created = new SpeedMatrix(
            json.periods,
            json.center,
            json.zoneRange,
            json.speedComputing,
            json.trustedIndicator,
            json.flattenPositionRange);

        if (json.flattenPositionHistory) {
            created.flattenPositionHistory = json.flattenPositionHistory;
        }
        if (json.flattenSpeedPosition) {
            created.flattenSpeedPosition = json.flattenSpeedPosition;
        }
        if (json.qualityPoints) {
            created.qualityPoints = json.qualityPoints;
        }

        return created;
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

    renderFlatten(): PositionValue[] {

        const positionMatrix = this.getFlatten();
        if (positionMatrix.length === 0) {
            return [];
        }

        // compute flattenSpeedPosition
        this.flattenSpeedPosition = new Position(0, 0);
        let maxValue = 0;
        const positionHistories = [];
        for (const [iX, posX] of positionMatrix.entries()) {
            for (const [iY, value] of posX.entries()) {
                const x = iX + this.flattenPositionRange.xMin;
                const y = iY + this.flattenPositionRange.yMin;
                positionHistories.push(new PositionValue(x, y, value));
                maxValue = Math.max(maxValue, value);
                if (maxValue === value && value > 0) {
                    this.flattenSpeedPosition = new Position(x, y);
                }
            }
        }

        // if (options.square) {
        //     // show a square around the flattenSpeedPosition
        //     const squareWidth = 1;
        //     positionHistories.forEach(p => {
        //         const inTheSquareX = this.flattenSpeedPosition.x - squareWidth <= p.x
        //         && p.x <= this.flattenSpeedPosition.x + squareWidth;
        //         const inTheSquareY = this.flattenSpeedPosition.y - squareWidth <= p.y
        //         && p.y <= this.flattenSpeedPosition.y + squareWidth;
        //         if (inTheSquareX && inTheSquareY) {
        //             p.value = maxValue;
        //         }
        //     });
        // }

        return positionHistories;
    }

    getGaugeIdRelatedValues(id: string): QualityPoint {
        if (this.qualityPoints) {
            const points = this.qualityPoints.filter(p => p.gaugeId === id);
            if (points.length === 1) {
                return points[0];
            }
        }

        if (!this.flattenSpeedPosition) {
            this.renderFlatten();
        }

        const maxPositionHistories = this.getFlatten();
        if (maxPositionHistories.length === 0 || !this.speedComputing) {
            return undefined;
        }

        const gaugePosition = this.speedComputing.getGaugePosition(id);
        const gaugeLat = gaugePosition?.x;
        const gaugeLng = gaugePosition?.y;
        const gaugeDate = gaugePosition?.date;
        const gaugeValue = gaugePosition?.value;

        // Compute speeds around flattenSpeedPosition with zoneRange
        const diffInZone = {};
        let minDiff;
        for (let x = -this.zoneRange; x <= this.zoneRange; x++) {
            for (let y = -this.zoneRange; y <= this.zoneRange; y++) {
                const rainP = this.speedComputing.getRainPosition(
                    gaugePosition,
                    {
                        x: this.flattenSpeedPosition.x + x,
                        y: this.flattenSpeedPosition.y + y
                    });
                if (rainP) {
                    const diff = Math.abs(rainP.value - gaugeValue);
                    diffInZone['x' + x + ',y' + y] = diff;
                    if (typeof minDiff === 'undefined' || Math.min(minDiff, diff) < minDiff) {
                        minDiff = diff;
                    }
                }
            }
        }

        // Find the max cumulative value to get the most efficient speed
        let speed = {x: this.flattenSpeedPosition.x, y: this.flattenSpeedPosition.y};
        for (const xy in diffInZone) {
            if (diffInZone.hasOwnProperty(xy) && minDiff === diffInZone[xy]) {
                speed = {
                    x: this.flattenSpeedPosition.x + parseInt(xy.substring(xy.indexOf('x') + 1, xy.indexOf(',y')), 10),
                    y: this.flattenSpeedPosition.y + parseInt(xy.substring(xy.indexOf(',y') + 2, xy.length), 10)
                }
                break;
            }
        }

        // Based on most efficient speed, build qualityPoint
        let rainLat, rainLng, rainDate, rainValue;
        const rainPosition = this.speedComputing.getRainPosition(gaugePosition, speed);
        rainLat = rainPosition?.x;
        rainLng = rainPosition?.y;
        rainDate = rainPosition?.date;
        rainValue = rainPosition?.value;
        speed = this.speedComputing.getRelativeSpeed(speed);

        const qualityPoint = new QualityPoint(id, gaugeDate, rainDate,
            new CartesianValue(gaugeValue, gaugeLat, gaugeLng),
            new CartesianValue(rainValue, rainLat, rainLng),
            speed);

        return qualityPoint;
    }

    getGaugeIds(): string[] {
        const gaugeIds = [];
        this.periods[0]?.forEach(p => {
            if (gaugeIds.indexOf(p.id) < 0) {
                gaugeIds.push(p.id);
            }
        });
        return gaugeIds;
    }

    getQualityPoints(): QualityPoint[] {
        if (this.qualityPoints) {
            return this.qualityPoints;
        }

        const gaugeIds = this.getGaugeIds();

        // find all qualityPoints
        this.qualityPoints = [];
        for (const gaugeId of gaugeIds) {
            const result = this.getGaugeIdRelatedValues(gaugeId);
            this.qualityPoints.push(result);
        }

        return this.qualityPoints;
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

    getTrustedIndicator(): number {
        return this.trustedIndicator;
    }

    isConsistent(): boolean {
        return this.trustedIndicator > SpeedMatrix.DEFAULT_TRUSTED_INDICATOR / 2;
    }

    toJSON(options?: { removePeriods: boolean }) {
        const json = {
            flattenPositionHistory: this.flattenPositionHistory,
            flattenPositionRange: this.flattenPositionRange,
            qualityPoints: this.qualityPoints,
            flattenSpeedPosition: this.flattenSpeedPosition,
            zoneRange: this.zoneRange,
            periods: this.periods,
            center: this.center,
            trustedIndicator: this.trustedIndicator,
        };

        if (options?.removePeriods) {
            delete json.periods;
        }

        return json;
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

    protected getFlatten(): number[][] {
        if (this.flattenPositionHistory) {
            return this.flattenPositionHistory;
        }

        //   let xMax, xMin, yMax, yMin;
        //   for (const period of this.periods) {
        //       for (const position of period) {
        //           xMax = this.findMax(xMax, position.x);
        //           xMin = this.findMin(xMin, position.x);
        //           yMax = this.findMax(yMax, position.y);
        //           yMin = this.findMin(yMin, position.y);
        //       }
        //   }
        //   this.flattenPositionRange = {xMax, xMin, yMax, yMin};

        this.flattenPositionHistory = [];
        for (let x = 0; x <= this.flattenPositionRange.xMax - this.flattenPositionRange.xMin; x++) {
            this.flattenPositionHistory.push(Array(this.flattenPositionRange.yMax - this.flattenPositionRange.yMin + 1).fill(0));
        }

        // same position => add value
        for (const period of this.periods) {
            for (const position of period) {
                const positionX = position.x - this.flattenPositionRange.xMin;
                const positionY = position.y - this.flattenPositionRange.yMin;
                this.flattenPositionHistory[positionX][positionY] += position.value;
            }
        }

        return this.flattenPositionHistory;
    }

}
