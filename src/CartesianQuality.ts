import {CartesianRainHistory} from './history/CartesianRainHistory';
import {CartesianGaugeHistory} from './history/CartesianGaugeHistory';
import {RainComputationQuality} from 'raain-model';
import {SpeedComputing} from './tools/SpeedComputing';
import {PositionHistory} from './history/PositionHistory';
import {SpeedMatrixContainer} from './tools/SpeedMatrixContainer';
import {Converter} from './tools/Converter';

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

        const dates = {minDate: undefined, maxDate: undefined, stepInSec: undefined};
        const beforeLaunching = new Date();

        const gaugeHistories = this.cartesianGaugeHistories.map(gh => {
            const position = Converter.MapLatLngToPosition(gh.value, true);
            return new PositionHistory(gh.gaugeId, new Date(gh.date), position.x, position.y, gh.value.value);
        });
        const rainHistories = this.cartesianRainHistories.map((rh, index) => {
            this.storeDates(dates, rh);
            const position = Converter.MapLatLngToPosition(rh.computedValue, true);
            return new PositionHistory('rain' + index,
                new Date(rh.periodBegin),
                position.x, position.y,
                rh.computedValue.value);
        });

        const periodMinutes = Math.round((dates.maxDate?.getTime() - dates.minDate?.getTime()) / 60000);
        const periodCount = Math.round(periodMinutes * 60 / dates.stepInSec);

        const speedComputing = new SpeedComputing(rainHistories, gaugeHistories);
        const speedMatrix = speedComputing.computeSpeedMatrix(dates.maxDate, {periodCount, periodMinutes});
        if (!speedMatrix) {
            throw new Error('impossible to compute Quality Speed Matrix');
        }

        this.rainComputationQuality = new RainComputationQuality(
            'qualityId' + new Date().toISOString(),
            dates.minDate, dates.maxDate,
            [],
            0,
            'v0.0.1'); // TODO align version
        this.rainComputationQuality.qualitySpeedMatrixContainer = new SpeedMatrixContainer([speedMatrix]);
        this.rainComputationQuality.timeSpentInMs = new Date().getTime() - beforeLaunching.getTime();
        return this.rainComputationQuality;
    }

    //  getGaugeLatLngFrom(position: Position): LatLng {
    //      this.cartesianRainHistories.filter(h => h.computedValue.lat);
    //      return new LatLng(position.x, position.y);
    //  }

    toJSON() {
        return {
            cartesianRainHistories: this.cartesianRainHistories,
            cartesianGaugeHistories: this.cartesianGaugeHistories,
        };
    }

    private storeDates(dates: { minDate: Date, maxDate: Date, stepInSec: number }, cartesianRainHistory: CartesianRainHistory): void {
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


        if (!dates.stepInSec) {
            let stepInSec = 0;
            if (cartesianRainHistory.periodEnd) {
                const end = new Date(cartesianRainHistory.periodEnd);
                stepInSec = (end.getTime() - historyDate.getTime()) / 1000;
            }
            if (stepInSec) {
                dates.stepInSec = stepInSec;
            }
        }
    }
}
