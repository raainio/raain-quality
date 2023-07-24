import {CartesianRainHistory} from './history/CartesianRainHistory';
import {CartesianGaugeHistory} from './history/CartesianGaugeHistory';
import {RainComputationQuality} from 'raain-model';
import {SpeedMatrix} from './tools/SpeedMatrix';
import {SpeedComputing} from './tools/SpeedComputing';
import {PositionHistory} from './history/PositionHistory';
import {Position} from './tools/Position';
import {LatLng} from './tools/LatLng';

export class CartesianQuality {

    public static DEFAULT_SCALE = 0.01;
    public static DEFAULT_AROUND_RANGE = 8;
    private rainComputationQuality: RainComputationQuality;

    constructor(
        protected cartesianRainHistories: CartesianRainHistory[],
        protected cartesianGaugeHistories: CartesianGaugeHistory[]
    ) {
    }

    public async getRainComputationQuality(): Promise<RainComputationQuality> {

        if (this.rainComputationQuality) {
            return this.rainComputationQuality;
        }

        this.rainComputationQuality = new RainComputationQuality(
            'in progress...',
            null, null,
            [],
            0,
            0,
            'none',
            {rainMeasureValue: undefined, gaugeMeasureValue: undefined});

        if (this.cartesianRainHistories.length === 0) {
            console.warn('>> raain-quality ### no cartesianRainHistory => impossible to compute quality');
            // @ts-ignore
            this.rainComputationQuality['id'] = 'no cartesianRainHistory';
            return this.rainComputationQuality;
        }
        if (this.cartesianGaugeHistories.length === 0) {
            console.warn('>> raain-quality ### no cartesianGaugeHistory => impossible to compute quality');
            // @ts-ignore
            this.rainComputationQuality['id'] = 'no cartesianGaugeHistory';
            return this.rainComputationQuality;
        }

        const dates = {minDate: undefined, maxDate: undefined};
        const beforeLaunching = new Date();

        const gaugeHistories = this.cartesianGaugeHistories.map(h => {
            return new PositionHistory(h.gaugeId, h.date, h.value.lat, h.value.lng, h.value.value);
        });
        const rainHistories = this.cartesianRainHistories.map((h, index) => {
            this.storeDates(dates, h);
            return new PositionHistory('rain' + index, h.periodBegin, h.computedValue.lat, h.computedValue.lng, h.computedValue.value);
        });
        const speedComputing = new SpeedComputing(rainHistories, gaugeHistories);
        const speedMatrix = speedComputing.computeSpeedMatrix(dates.maxDate);
        if (!speedMatrix) {
            throw new Error('impossible to compute Quality Speed Matrix');
        }

        const maximums = {
            rainMeasureValue: speedMatrix.getMaxRain(),
            gaugeMeasureValue: speedMatrix.getMaxGauge()
        };

        this.rainComputationQuality = new RainComputationQuality(
            'qualityId' + new Date().toISOString(),
            dates.minDate, dates.maxDate,
            [],
            SpeedMatrix.computeQualityIndicator(speedMatrix.getQualityPoints()),
            0,
            'v1.1');
        this.rainComputationQuality.maximums = maximums;
        this.rainComputationQuality.qualitySpeedMatrix = speedMatrix;
        this.rainComputationQuality.timeSpentInMs = new Date().getTime() - beforeLaunching.getTime();
        return this.rainComputationQuality;
    }

    getGaugeLatLngFrom(position: Position): LatLng {

        this.cartesianRainHistories.filter(h => h.computedValue.lat);

        return new LatLng(position.x, position.y);
    }

    private storeDates(dates: { minDate: Date, maxDate: Date }, cartesianRainHistory: CartesianRainHistory): void {
        if (!dates.minDate
            || Math.min(dates.minDate.getTime(), cartesianRainHistory.periodBegin.getTime())
            === cartesianRainHistory.periodBegin.getTime()) {
            dates.minDate = cartesianRainHistory.periodBegin;
        }

        if (!dates.maxDate
            || Math.max(dates.maxDate.getTime(), cartesianRainHistory.periodEnd.getTime())
            === cartesianRainHistory.periodEnd.getTime()) {
            dates.maxDate = cartesianRainHistory.periodEnd;
        }
    }

}
