import {CartesianRainHistory} from './history/CartesianRainHistory';
import {CartesianGaugeHistory} from './history/CartesianGaugeHistory';
import {RainComputationQuality} from 'raain-model';
import {QualityTools} from './tools/QualityTools';
import {SpeedComparator} from './tools/SpeedComparator';
import {SpeedComputing} from './tools/SpeedComputing';
import {QualityPoint} from './tools/QualityPoint';
import {PositionHistory} from './history/PositionHistory';
import {LatLng} from './tools/LatLng';

export class CartesianQuality {

    constructor(
        protected cartesianRainHistories: CartesianRainHistory[],
        protected cartesianGaugeHistories: CartesianGaugeHistory[],
        private distanceRatio = CartesianQuality.DEFAULT_SCALE
    ) {
    }

    public static DEFAULT_SCALE = 0.01;

    public static DEFAULT_AROUND_RANGE = 8;

    private rainComputationQuality: RainComputationQuality;

    public static GetBestAssociatedRainCartesianHistory(cartesianGaugeHistory: CartesianGaugeHistory,
                                                        cartesianRainHistories: CartesianRainHistory[],
                                                        scale = CartesianQuality.DEFAULT_SCALE): CartesianRainHistory {
        let minDelta = null;
        let bestCartesianRainHistory = null;
        cartesianRainHistories.forEach(c => {
            const samePeriod = c.periodBegin.getTime() < cartesianGaugeHistory.date.getTime()
                && cartesianGaugeHistory.date.getTime() <= c.periodEnd.getTime();

            const isNear = QualityTools.isAroundLatLng(
                new LatLng(cartesianGaugeHistory.value.lat, cartesianGaugeHistory.value.lng),
                new LatLng(c.computedValue.lat, c.computedValue.lng),
                CartesianQuality.DEFAULT_AROUND_RANGE, scale);

            const delta = Math.abs(c.computedValue.value - cartesianGaugeHistory.value.value);
            const isOneBestValue = minDelta === null || minDelta > delta;

            if (isNear && samePeriod && isOneBestValue) {
                minDelta = delta;
                bestCartesianRainHistory = c;
            }
        });
        return bestCartesianRainHistory;
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
            {rainMeasureValue: undefined, gaugeMeasureValue: undefined},
            {angleDegrees: 0, speedMetersPerSec: 0},
            [],
            0);

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

        const cartesianRainHistoriesFiltered = this.cartesianRainHistories.filter(cartesianRainHistory => {
            this.storeDates(dates, cartesianRainHistory);

            let outOfAllGauges = true;
            for (const cartesianGaugeHistory of this.cartesianGaugeHistories) {
                if (QualityTools.isNotAroundLatLng(
                    new LatLng(cartesianGaugeHistory.value.lat, cartesianGaugeHistory.value.lng),
                    new LatLng(cartesianRainHistory.computedValue.lat, cartesianRainHistory.computedValue.lng),
                    CartesianQuality.DEFAULT_AROUND_RANGE,
                    this.distanceRatio)) {
                    outOfAllGauges = outOfAllGauges && true;
                } else {
                    return true;
                }
            }
            return !outOfAllGauges;
        });

        const maximums = {rainMeasureValue: undefined, gaugeMeasureValue: undefined};
        const points: QualityPoint[] = [];
        for (const cartesianGaugeHistory of this.cartesianGaugeHistories) {

            const cartesianRainHistoryTranslated = CartesianQuality.GetBestAssociatedRainCartesianHistory(
                cartesianGaugeHistory, cartesianRainHistoriesFiltered, this.distanceRatio);
            if (cartesianRainHistoryTranslated === null) {
                const message = '>> raain-quality ### No rain history corresponding to gauge, probably a data mismatch ? (gauge:'
                    + cartesianGaugeHistory.value.lat + ',' + cartesianGaugeHistory.value.lng + ',' + cartesianGaugeHistory.date
                    + ') vs (rain:'
                    + this.cartesianRainHistories[0]?.computedValue.lat + ',' + this.cartesianRainHistories[0]?.computedValue.lng
                    + ',' + this.cartesianRainHistories[0]?.periodBegin + ',' + this.cartesianRainHistories[0]?.periodEnd
                    + ' __ '
                    + this.cartesianRainHistories[this.cartesianRainHistories.length - 1]?.computedValue.lat
                    + ',' + this.cartesianRainHistories[this.cartesianRainHistories.length - 1]?.computedValue.lng
                    + ',' + this.cartesianRainHistories[this.cartesianRainHistories.length - 1]?.periodBegin
                    + ',' + this.cartesianRainHistories[this.cartesianRainHistories.length - 1]?.periodEnd
                    + ')';
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
            'v1.1');

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

    public getAssociatedRainCartesianHistory(cartesianGaugeHistory: CartesianGaugeHistory,
                                             speed: SpeedComparator,
                                             scale = CartesianQuality.DEFAULT_SCALE): CartesianRainHistory {

        const filtered = this.cartesianRainHistories.filter(c => {
            const sameLat = QualityTools.isEqualsLatLng(
                c.computedValue.lat,
                speed.getLatitudeDiff(scale) + cartesianGaugeHistory.value.lat,
                scale);
            const sameLng = QualityTools.isEqualsLatLng(
                c.computedValue.lng,
                speed.getLongitudeDiff(scale) + cartesianGaugeHistory.value.lng,
                scale);
            const samePeriod = c.periodBegin.getTime() < cartesianGaugeHistory.date.getTime()
                && cartesianGaugeHistory.date.getTime() <= c.periodEnd.getTime();
            return sameLat && sameLng && samePeriod;
        });
        console.log('filtered:', filtered);
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
