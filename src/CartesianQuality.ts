import {CartesianRainHistory} from './history/CartesianRainHistory';
import {CartesianGaugeHistory} from './history/CartesianGaugeHistory';
import {RainComputationQuality} from 'raain-model';
import {SpeedComputing} from './tools/SpeedComputing';
import {PositionHistory} from './history/PositionHistory';
import {Position} from './tools/Position';
import {LatLng} from './tools/LatLng';
import {SpeedMatrixContainer} from './tools/SpeedMatrixContainer';

export class CartesianQuality {

    public static DEFAULT_SCALE = 0.01;
    private rainComputationQuality: RainComputationQuality;

    constructor(
        protected cartesianRainHistories: CartesianRainHistory[],
        protected cartesianGaugeHistories: CartesianGaugeHistory[]
    ) {
    }

    public static createFromJson(json): CartesianQuality {
        const created = new CartesianQuality([], []);
        if (json.cartesianRainHistories) {
            created.cartesianRainHistories = json.cartesianRainHistories;
        }
        if (json.cartesianGaugeHistories) {
            created.cartesianGaugeHistories = json.cartesianGaugeHistories;
        }
        return created;
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
            'none',
            undefined);

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
            return new PositionHistory(h.gaugeId, new Date(h.date), h.value.lat, h.value.lng, h.value.value);
        });
        const rainHistories = this.cartesianRainHistories.map((h, index) => {
            this.storeDates(dates, h);
            return new PositionHistory('rain' + index,
                new Date(h.periodBegin),
                h.computedValue.lat, h.computedValue.lng, h.computedValue.value);
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
            0,
            'v0.0.1');
        this.rainComputationQuality.qualitySpeedMatrixContainer = new SpeedMatrixContainer([speedMatrix]);
        this.rainComputationQuality.timeSpentInMs = new Date().getTime() - beforeLaunching.getTime();
        return this.rainComputationQuality;
    }

    getGaugeLatLngFrom(position: Position): LatLng {

        this.cartesianRainHistories.filter(h => h.computedValue.lat);

        return new LatLng(position.x, position.y);
    }

    toJSON() {
        return {
            cartesianRainHistories: this.cartesianRainHistories,
            cartesianGaugeHistories: this.cartesianGaugeHistories,
        };
    }

    private storeDates(dates: { minDate: Date, maxDate: Date }, cartesianRainHistory: CartesianRainHistory): void {
        const historyDate = new Date(cartesianRainHistory.periodBegin);
        if (!dates.minDate
            || Math.min(new Date(dates.minDate).getTime(), historyDate.getTime())
            === historyDate.getTime()) {
            dates.minDate = historyDate;
        }

        if (!dates.maxDate
            || Math.max(new Date(dates.maxDate).getTime(), historyDate.getTime())
            === historyDate.getTime()) {
            dates.maxDate = historyDate;
        }
    }
}
