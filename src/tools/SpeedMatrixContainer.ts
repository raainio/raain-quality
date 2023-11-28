import {CartesianValue, QualityPoint} from 'raain-model';
import {SpeedMatrix} from './SpeedMatrix';
import {PositionValue} from './PositionValue';

const uniq = a => [...new Set(a)];

export class SpeedMatrixContainer {

    protected qualityPoints: QualityPoint[];
    protected trustedIndicators: number[];
    protected flattenMatrices: PositionValue[][];

    constructor(
        protected matrices: SpeedMatrix[],
    ) {
        this.trustedIndicators = [];
        this.flattenMatrices = [];
    }

    public static CreateFromJson(json): SpeedMatrixContainer {
        const created = new SpeedMatrixContainer([]);
        if (json.qualityPoints) {
            created.qualityPoints = json.qualityPoints;
        }
        if (json.trustedIndicators) {
            created.trustedIndicators = json.trustedIndicators;
        }
        if (json.flattenMatrices) {
            created.flattenMatrices = json.flattenMatrices;
        }
        return created;
    }

    getMatrix(index = 0) {
        return this.getMatrices()[index];
    }

    getMatrices() {
        return this.matrices;
    }

    getGaugeIdRelatedValues(gaugeId: string): QualityPoint {
        if (this.qualityPoints) {
            const points = this.qualityPoints.filter(p => p.gaugeId === gaugeId);
            if (points.length === 1) {
                return points[0];
            }
        }

        let sumGauge = 0;
        let sumRain = 0;
        for (const matrix of this.getMatrices()) {
            try {
                const qualityPoint = matrix.getGaugeIdRelatedValues(gaugeId);
                sumGauge += qualityPoint.gaugeCartesianValue.value;
                sumRain += qualityPoint.rainCartesianValue.value;
            } catch (e) {
                console.warn('>> raain-quality ### Impossible to retrieve some GaugeIdRelatedValues', gaugeId, e);
            }
        }

        return new QualityPoint(gaugeId, null, null,
            new CartesianValue(sumGauge, null, null),
            new CartesianValue(sumRain, null, null),
            null);
    }

    getQualityPoints(): QualityPoint[] {
        if (this.qualityPoints) {
            return this.qualityPoints;
        }

        // all gauges & flattenMatrices
        let gaugeIds = [];
        const flattenMatrices = [];
        for (const matrix of this.getMatrices()) {
            gaugeIds = gaugeIds.concat(matrix.getGaugeIds());
            flattenMatrices.push(matrix.renderFlatten());
        }
        gaugeIds = uniq(gaugeIds);

        // find all qualityPoints
        const qualityPoints = [];
        for (const gaugeId of gaugeIds) {
            const result = this.getGaugeIdRelatedValues(gaugeId);
            qualityPoints.push(result);
        }

        // store
        this.qualityPoints = qualityPoints;
        this.flattenMatrices = flattenMatrices;
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

    /**
     * Get summed quality indicator (0 ideally)
     *  @link SpeedMatrix.ComputeQualityIndicator
     */
    getQuality(): number {
        const qualityPoints = this.getQualityPoints();
        return SpeedMatrix.ComputeQualityIndicator(qualityPoints);
    }

    getTrustedIndicators(): number[] {
        if (this.trustedIndicators.length > 0) {
            return this.trustedIndicators;
        }

        this.trustedIndicators = [];
        for (const matrix of this.getMatrices()) {
            this.trustedIndicators.push(matrix.getTrustedTechnicalIndicator());
        }

        return this.trustedIndicators;
    }

    getFlattenMatrixCount(): number {
        return this.flattenMatrices.length;
    }

    renderFlattenMatrix(index = 0): PositionValue[] {
        if (this.flattenMatrices && this.flattenMatrices[index]) {
            return this.flattenMatrices[index];
        }

        this.getQualityPoints();
        return this.flattenMatrices[index];
    }

    toJSON(options?: { removeFlatten: boolean, removeIndicators: boolean }) {
        const json = {
            qualityPoints: this.getQualityPoints(),
            trustedIndicators: this.getTrustedIndicators(),
            flattenMatrices: this.flattenMatrices,
        };

        if (options?.removeFlatten) {
            delete json.flattenMatrices;
        }
        if (options?.removeIndicators) {
            delete json.trustedIndicators;
        }

        return json;
    }

    merge(speedMatrixContainerToMergeIn: SpeedMatrixContainer) {

        this.matrices = this.mergeConcat(this.matrices, speedMatrixContainerToMergeIn.matrices);
        this.flattenMatrices = this.mergeConcat(this.flattenMatrices, speedMatrixContainerToMergeIn.flattenMatrices);
        this.qualityPoints = this.mergeReduce(this.getQualityPoints(), speedMatrixContainerToMergeIn.getQualityPoints());
        this.trustedIndicators = this.mergeConcat(this.getTrustedIndicators(), speedMatrixContainerToMergeIn.getTrustedIndicators());

        return this;
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

    protected mergeDateMin(d1: Date, d2: Date): Date {
        const stillComputed = this.mergeStillComputed(d1, d2);
        if (stillComputed === null) {
            return new Date(Math.min(new Date(d1).getTime(), new Date(d2).getTime()));
        }
        if (stillComputed !== undefined) {
            return new Date(stillComputed);
        }
        return stillComputed;
    }

    protected mergeDateMax(d1: Date, d2: Date): Date {
        const stillComputed = this.mergeStillComputed(d1, d2);
        if (stillComputed === null) {
            return new Date(Math.max(new Date(d1).getTime(), new Date(d2).getTime()));
        }
        if (stillComputed !== undefined) {
            return new Date(stillComputed);
        }
        return stillComputed;
    }

    protected mergeAvg(v1: number, v2: number): number {
        const stillComputed = this.mergeStillComputed(v1, v2);
        if (stillComputed === null) {
            return (v1 + v2) / 2;
        }
        return stillComputed;
    }

    protected mergeMin(v1: number, v2: number): number {
        const stillComputed = this.mergeStillComputed(v1, v2);
        if (stillComputed === null) {
            return Math.min(v1, v2);
        }
        return stillComputed;
    }

    protected mergeConcat(a1: Array<any>, a2: Array<any>): Array<any> {
        const stillComputed = this.mergeStillComputed(a1, a2);
        if (stillComputed === null) {
            return a1.concat(a2);
        }
        return stillComputed;
    }

    protected mergeReduce(a1: Array<QualityPoint>, a2: Array<QualityPoint>): Array<QualityPoint> {
        const stillComputed = this.mergeStillComputed(a1, a2);
        if (stillComputed === null) {

            const ids = new Map();
            const concatted = a1.concat(a2);
            for (const qualityPoint of concatted) {
                let oldValue = {
                    gaugeValue: 0,
                    rainValue: 0
                };
                if (ids.has(qualityPoint.gaugeId)) {
                    oldValue = ids.get(qualityPoint.gaugeId);
                }
                ids.set(qualityPoint.gaugeId, {
                    gaugeValue: qualityPoint.gaugeCartesianValue.value + oldValue.gaugeValue,
                    rainValue: qualityPoint.rainCartesianValue.value + oldValue.rainValue,
                });
            }

            const arr = [...ids].map(([name, value]) => {
                return new QualityPoint(name, null, null,
                    new CartesianValue(value.gaugeValue, null, null),
                    new CartesianValue(value.rainValue, null, null),
                    null);
            });
            return arr;
        }
        return stillComputed;
    }


}
