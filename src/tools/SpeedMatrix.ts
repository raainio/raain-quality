import {PositionHistory} from '../history/PositionHistory';
import {Position} from './Position';
import {CartesianValue, QualityPoint} from 'raain-model';
import {PositionValue} from './PositionValue';
import {SpeedComputing} from './SpeedComputing';
import {Converter} from './Converter';

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

    /**
     * Get quality indicator based on delta from computed vs reality
     *  0 is ideal
     *  2.56 (for example) is not ideal => can be improved :)
     */
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

        // normalize
        if (maxValue) {
            positionHistories.forEach(p => {
                p.value = p.value / maxValue;
            });
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
        const gaugeLatLng = Converter.MapPositionToLatLng(gaugePosition);
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
        const rainPosition = this.speedComputing.getRainPosition(gaugePosition, speed);
        const rainLatLng = Converter.MapPositionToLatLng(rainPosition);
        const rainDate = rainPosition?.date;
        const rainValue = rainPosition?.value;
        speed = this.speedComputing.getRelativeSpeed(speed);

        const qualityPoint = new QualityPoint(id, gaugeDate, rainDate,
            new CartesianValue(gaugeValue, gaugeLatLng.lat, gaugeLatLng.lng),
            new CartesianValue(rainValue, rainLatLng.lat, rainLatLng.lng),
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

    logFlatten() {
        const flatten = this.renderFlatten();

        const labelWithSign = (val) => {
            if (val < 0) {
                return '' + val;
            } else if (val === 0) {
                return ' ' + 0;
            }
            return '+' + val;
        }
        const labelX = (x) => {
            return 'x' + labelWithSign(x - this.flattenPositionRange.xMax);
        };
        const labelY = (y) => {
            return 'y' + labelWithSign(y - this.flattenPositionRange.yMax);
        };

        const matrixToRender = {};
        for (let y = this.flattenPositionRange.yMax - this.flattenPositionRange.yMin; y >= 0; y--) {
            const xObject = {};
            for (let x = 0; x <= this.flattenPositionRange.xMax - this.flattenPositionRange.xMin; x++) {
                xObject[labelX(x)] = 0;
            }
            matrixToRender[labelY(y)] = xObject;
        }
        for (let x = this.flattenPositionRange.xMin; x <= this.flattenPositionRange.xMax; x++) {
            for (let y = this.flattenPositionRange.yMin; y <= this.flattenPositionRange.yMax; y++) {
                const value = flatten.filter(p => p.x === x && p.y === y)[0];
                const yOfMatrix = y - this.flattenPositionRange.yMin; // this.flattenPositionRange.yMax - y;
                const xOfMatrix = x - this.flattenPositionRange.xMin;
                matrixToRender[labelY(yOfMatrix)][labelX(xOfMatrix)] = Math.round(value.value * 1000) / 1000;
            }
        }

        console.log('this.flattenSpeedPosition:', this.flattenSpeedPosition);
        console.table(matrixToRender);
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

        this.flattenPositionHistory = [];
        for (let y = 0; y <= this.flattenPositionRange.yMax - this.flattenPositionRange.yMin; y++) {
            this.flattenPositionHistory.push(Array(this.flattenPositionRange.xMax - this.flattenPositionRange.xMin + 1).fill(0));
        }

        // same position => add value
        for (const [index, period] of this.periods.entries()) {
            for (const position of period) {
                const positionX = position.x - this.flattenPositionRange.xMin;
                const positionY = position.y - this.flattenPositionRange.yMin;
                this.flattenPositionHistory[positionX][positionY] += (position.value / (index + 1));
            }
        }

        return this.flattenPositionHistory;
    }

}
