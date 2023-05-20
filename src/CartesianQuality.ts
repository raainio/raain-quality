import {CartesianRainHistory} from './history/CartesianRainHistory';
import {CartesianGaugeHistory} from './history/CartesianGaugeHistory';
import {RainComputationQuality} from 'raain-model';
import {QualityTools} from './tools/QualityTools';
import {SpeedComparator} from './tools/SpeedComparator';
import {SpeedComputing} from './tools/SpeedComputing';
import {QualityPoint} from './tools/QualityPoint';
import {PositionHistory} from './history/PositionHistory';

export class CartesianQuality {

    constructor(
        protected cartesianRainHistories: CartesianRainHistory[],
        protected cartesianGaugeHistories: CartesianGaugeHistory[],
        private distanceRatio = CartesianQuality.DEFAULT_SCALE
    ) {
    }

    public static DEFAULT_SCALE = 0.01;

    private rainComputationQuality: RainComputationQuality;

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
            {rainMeasureValue: undefined, gaugeMeasureValue: undefined},
            {angleDegrees: 0, speedMetersPerSec: 0},
            [],
            0);

        if (this.cartesianRainHistories.length === 0) {
            console.warn('no cartesianRainHistory => impossible to compute quality');
            // @ts-ignore
            this.rainComputationQuality['id'] = 'no cartesianRainHistory';
            return this.rainComputationQuality;
        }
        if (this.cartesianGaugeHistories.length === 0) {
            console.warn('no cartesianGaugeHistory => impossible to compute quality');
            // @ts-ignore
            this.rainComputationQuality['id'] = 'no cartesianGaugeHistory';
            return this.rainComputationQuality;
        }

        const gaugeHistories = [];
        for (const cartesianGaugeHistory of this.cartesianGaugeHistories) {
            gaugeHistories.push(new PositionHistory(
                cartesianGaugeHistory.gaugeId,
                cartesianGaugeHistory.date,
                Math.round(cartesianGaugeHistory.value.lat / this.distanceRatio),
                Math.round(cartesianGaugeHistory.value.lng / this.distanceRatio),
                cartesianGaugeHistory.value.value));
        }

        const rainHistories = [];
        const dates = {minDate: undefined, maxDate: undefined};
        for (const cartesianRainHistory of this.cartesianRainHistories) {
            this.storeDates(dates, cartesianRainHistory);
            rainHistories.push(new PositionHistory(
                'rain' + rainHistories.length,
                cartesianRainHistory.periodBegin,
                Math.round(cartesianRainHistory.computedValue.lat / this.distanceRatio),
                Math.round(cartesianRainHistory.computedValue.lng / this.distanceRatio),
                cartesianRainHistory.computedValue.value));
        }

        const speed = this.computeSpeed(rainHistories, gaugeHistories);

        const maximums = {rainMeasureValue: undefined, gaugeMeasureValue: undefined};
        const points: QualityPoint[] = [];
        for (const cartesianGaugeHistory of this.cartesianGaugeHistories) {

            const cartesianRainHistoryTranslated = this.getAssociatedRainCartesianHistory(cartesianGaugeHistory, speed, this.distanceRatio);
            if (cartesianRainHistoryTranslated === null) {
                const message = 'No rain history corresponding to gauge, probably a data mismatch ? ('
                    + cartesianGaugeHistory.value.lat + ',' + cartesianGaugeHistory.value.lng + ') vs ('
                    + this.cartesianRainHistories[0]?.computedValue.lat + ',' + this.cartesianRainHistories[0]?.computedValue.lng + ')';
                // throw Error(message);
                console.warn(message);
            } else {
                const point = new QualityPoint(cartesianGaugeHistory.gaugeId,
                    cartesianRainHistoryTranslated.computedValue,
                    cartesianGaugeHistory.value);

                this.storeMaximums(maximums, point);
                points.push(point);
            }
        }


        this.rainComputationQuality = new RainComputationQuality(
            'qualityId' + new Date().toISOString(),
            dates.minDate, dates.maxDate,
            [],
            0,
            0,
            'v1');

        delete speed.xDiff;
        delete speed.yDiff;
        this.rainComputationQuality.speed = speed;
        this.rainComputationQuality.maximums = maximums;
        this.rainComputationQuality.points = points;
        this.rainComputationQuality.indicator = this.computeQualityIndicator(points);

        return this.rainComputationQuality;
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

    private storeMaximums(maximums: { rainMeasureValue: number, gaugeMeasureValue: number },
                          point: QualityPoint): void {
        if (point.rainCartesianValue && (!maximums.rainMeasureValue
            || Math.max(maximums.rainMeasureValue, point.rainCartesianValue.value)
            === point.rainCartesianValue.value)) {
            maximums.rainMeasureValue = point.rainCartesianValue.value;
        }

        if (point.gaugeCartesianValue && (!maximums.gaugeMeasureValue
            || Math.max(maximums.gaugeMeasureValue, point.gaugeCartesianValue.value)
            === point.gaugeCartesianValue.value)) {
            maximums.gaugeMeasureValue = point.gaugeCartesianValue.value;
        }
    }

    private computeSpeed(rainHistories: PositionHistory[], gaugeHistories: PositionHistory[]): SpeedComparator {
        const speedComputing = new SpeedComputing(rainHistories, gaugeHistories, this.distanceRatio);
        return speedComputing.computeSpeed();
    }

    private getAssociatedRainCartesianHistory(cartesianGaugeHistory: CartesianGaugeHistory,
                                              speed: SpeedComparator,
                                              scale = CartesianQuality.DEFAULT_SCALE): CartesianRainHistory {

        const filtered = this.cartesianRainHistories.filter(c => {
            const sameLat = QualityTools.isEqualsLatLng(
                c.computedValue.lat,
                speed.getLatitudeDiff() + cartesianGaugeHistory.value.lat,
                scale);
            const sameLng = QualityTools.isEqualsLatLng(
                c.computedValue.lng,
                speed.getLongitudeDiff() + cartesianGaugeHistory.value.lng,
                scale);
            return sameLat && sameLng;
        });
        return filtered && filtered.length === 1 ? filtered[0] : null;
    }

    private computeQualityIndicator(points: QualityPoint[]
    ): number {
        let indicator = 0;
        for (const point of points) {
            indicator += Math.abs(point.rainCartesianValue?.value - point.gaugeCartesianValue?.value);
        }
        if (points.length > 0) {
            indicator = indicator / points.length;
        }

        return indicator;
    }

}
