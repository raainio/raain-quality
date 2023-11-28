import {PositionHistory} from '../history/PositionHistory';
import {Position} from './Position';
import {CartesianValue, QualityPoint} from 'raain-model';
import {PositionValue} from './PositionValue';
import {SpeedComputing} from './SpeedComputing';
import {Converter} from './Converter';

export class SpeedMatrix {

    public static DEFAULT_MATRIX_RANGE = 8;
    public static DEFAULT_ZONE_RANGE = 1;
    public static DEFAULT_TRUSTED_INDICATOR = 1;
    private static WEIGHT_ON = false;  // <=== TODO PLAY
    private static WEIGHT_RATIO = 0.2;  // <=== TODO PLAY

    protected flattenPositionHistory: number[][];
    protected flattenSpeedPosition: Position;
    protected qualityPoints: QualityPoint[];

    constructor(
        protected periods: PositionHistory[][],
        protected center: Position,
        protected zoneRange: number = SpeedMatrix.DEFAULT_ZONE_RANGE,
        private speedComputing: SpeedComputing = null,
        protected trustedTechnicalIndicator = SpeedMatrix.DEFAULT_TRUSTED_INDICATOR,
        protected flattenPositionRange: { xMin: number, xMax: number, yMin: number, yMax: number } = {xMin: -8, xMax: 8, yMin: -8, yMax: 8}
    ) {
    }

    public static CreateFromJson(json: any): SpeedMatrix {
        const created = new SpeedMatrix(
            json.periods,
            json.center,
            json.zoneRange,
            json.speedComputing,
            json.trustedTechnicalIndicator,
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
    public static ComputeQualityIndicator(points: QualityPoint[]): number {
        let indicator = 0;
        for (const point of points) {
            indicator += Math.abs(point.rainCartesianValue?.value - point.gaugeCartesianValue?.value);
        }
        if (points.length > 0) {
            indicator = indicator / points.length;
        }

        return indicator;
    }

    protected static ComputeBestSpeed(positionValues: PositionValue[],
                                      flattenPositionRange: { xMin: number, xMax: number, yMin: number, yMax: number },
                                      zoneRange: number) {

        let squarePosition = new Position(0, 0);
        const zoneWidth = new Position(zoneRange * 2 + 1, zoneRange * 2 + 1);
        const availablePositions: Position[] = [];
        for (let x = flattenPositionRange.xMin; x <= flattenPositionRange.xMax - zoneWidth.x; x++) {
            for (let y = flattenPositionRange.yMin; y <= flattenPositionRange.yMax - zoneWidth.y; y++) {
                availablePositions.push(new Position(x, y));
            }
        }

        let maxValue = 0;
        for (const position of availablePositions) {

            const pixels = positionValues
                .filter(p => SpeedComputing.IsInStrict(p, position, zoneWidth));
            const sumValue = pixels.reduce((prev, val) => val.value + prev, 0);
            maxValue = Math.max(maxValue, sumValue);
            if (maxValue === sumValue) {
                squarePosition = new Position(position.x + zoneRange, position.y + zoneRange);
            }
        }

        return squarePosition;
    }

    renderFlatten(): PositionValue[] {

        const positionMatrix = this.getFlatten();
        if (positionMatrix.length === 0) {
            return [];
        }

        const positionHistories: PositionValue[] = [];
        let maxValue = 0;
        for (const [iX, posX] of positionMatrix.entries()) {
            for (const [iY, value] of posX.entries()) {
                const x = iX + this.flattenPositionRange.xMin;
                const y = iY + this.flattenPositionRange.yMin;
                maxValue = Math.max(maxValue, value);
                positionHistories.push(new PositionValue(x, y, value));
            }
        }

        // compute flattenSpeedPosition
        this.flattenSpeedPosition = SpeedMatrix.ComputeBestSpeed(positionHistories, this.flattenPositionRange, this.zoneRange);

        // if (options.square) {
        // show a square around the flattenSpeedPosition
        const squareWidth = this.zoneRange;
        positionHistories.forEach(p => {
            const inTheSquareX = this.flattenSpeedPosition.x - squareWidth <= p.x
                && p.x <= this.flattenSpeedPosition.x + squareWidth;
            const inTheSquareY = this.flattenSpeedPosition.y - squareWidth <= p.y
                && p.y <= this.flattenSpeedPosition.y + squareWidth;
            if (inTheSquareX && inTheSquareY) {
                p.value = maxValue;
            }
        });
        // }

        if (maxValue) {
            positionHistories.forEach(p => {
                p.value = p.value / maxValue;
            });
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
        const relativeSpeed = this.speedComputing.getRelativeSpeed(speed);

        const qualityPoint = new QualityPoint(id, gaugeDate, rainDate,
            new CartesianValue(gaugeValue, gaugeLatLng.lat, gaugeLatLng.lng),
            new CartesianValue(rainValue, rainLatLng.lat, rainLatLng.lng),
            relativeSpeed);

        return qualityPoint;
    }

    getGaugeIds(): string[] {
        const gaugeIds = [];
        for (const p of this.periods[0] ? this.periods[0] : []) {
            if (gaugeIds.indexOf(p.id) < 0) {
                gaugeIds.push(p.id);
            }
        }
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
        for (const p of qualityPoints) {
            max = Math.max(max, p.rainCartesianValue.value);
        }
        return max;
    }

    getMaxGauge(): number {
        const qualityPoints = this.getQualityPoints();
        let max = -1;
        for (const p of qualityPoints) {
            max = Math.max(max, p.gaugeCartesianValue.value);
        }
        return max;
    }

    getTrustedTechnicalIndicator(): number {
        return this.trustedTechnicalIndicator;
    }

    isConsistent(): boolean {
        return this.trustedTechnicalIndicator > SpeedMatrix.DEFAULT_TRUSTED_INDICATOR / 2;
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
            trustedTechnicalIndicator: this.trustedTechnicalIndicator,
        };

        if (options?.removePeriods) {
            delete json.periods;
        }

        return json;
    }

    logFlatten(overridingLogger?, simplify?: boolean) {
        let logger = overridingLogger;
        if (!logger) {
            logger = console;
        }
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
        const valueDisplay = (v) => {
            if (simplify) {
                if (v === 1) {
                    return '##';
                } else if (v >= 0.8) {
                    return '#';
                } else if (v >= 0.5) {
                    return '=';
                } else if (v >= 0.2) {
                    return '_';
                }
                return ' ';
            }
            return Math.round(v * 1000) / 1000;
        }

        const matrixToRender = {};
        for (let y = this.flattenPositionRange.yMax - this.flattenPositionRange.yMin; y >= 0; y--) {
            const xObject = {};
            for (let x = 0; x <= this.flattenPositionRange.xMax - this.flattenPositionRange.xMin; x++) {
                xObject[labelX(x)] = valueDisplay(0);
            }
            matrixToRender[labelY(y)] = xObject;
        }
        for (let x = this.flattenPositionRange.xMin; x <= this.flattenPositionRange.xMax; x++) {
            for (let y = this.flattenPositionRange.yMin; y <= this.flattenPositionRange.yMax; y++) {
                const value = flatten.filter(p => p.x === x && p.y === y)[0];
                const yOfMatrix = y - this.flattenPositionRange.yMin;
                const xOfMatrix = x - this.flattenPositionRange.xMin;
                matrixToRender[labelY(yOfMatrix)][labelX(xOfMatrix)] = valueDisplay(value.value);
            }
        }

        logger.log('this.flattenSpeedPosition=', this.flattenSpeedPosition);
        logger.table(matrixToRender);
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
            this.flattenPositionHistory.push(new Array(this.flattenPositionRange.xMax - this.flattenPositionRange.xMin + 1).fill(0));
        }

        // same position => add value
        for (const [index, period] of this.periods.entries()) {
            for (const position of period) {
                const positionX = position.x - this.flattenPositionRange.xMin;
                const positionY = position.y - this.flattenPositionRange.yMin;
                let weight = 1;
                if (SpeedMatrix.WEIGHT_ON) {
                    weight = SpeedMatrix.WEIGHT_RATIO / (index + 1);
                }
                this.flattenPositionHistory[positionX][positionY] += position.value * weight;
            }
        }

        return this.flattenPositionHistory;
    }

}
