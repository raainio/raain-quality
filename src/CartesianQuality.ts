import {CartesianRainHistory} from './history/CartesianRainHistory';
import {CartesianGaugeHistory} from './history/CartesianGaugeHistory';
import {RainComputationQuality} from 'raain-model';
import {SpeedComputing} from './tools/SpeedComputing';
import {PositionHistory} from './history/PositionHistory';
import {SpeedMatrixContainer} from './tools/SpeedMatrixContainer';
import {Converter} from './tools/Converter';

import {Animation} from 'termination';
import {PassThrough} from 'node:stream';
import {Console} from 'node:console';
import {SpeedMatrix} from './tools/SpeedMatrix';
import {LatLng} from './tools/LatLng';

export class CartesianQuality {

    // scale of Pixel regarding LatLng : 1 => 100km, 0.01 => 1km, 0.005 => 500m
    public static DEFAULT_SCALE = 0.01;
    // Filter : [-30mn +5mn]
    private static FILTER_PERIOD_START_MN = -0;    // <=== TODO PLAY
    private static FILTER_PERIOD_END_MN = +5;       // <=== TODO PLAY

    private rainComputationQualities: { rainComputationQuality: RainComputationQuality, date: Date }[];

    constructor(
        protected cartesianRainHistories: CartesianRainHistory[],
        protected cartesianGaugeHistories: CartesianGaugeHistory[],
        protected cartesianPixelWidth: LatLng = new LatLng(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE),
    ) {
        this.rainComputationQualities = [];
    }

    public static CreateFromJson(json): CartesianQuality {
        const created = new CartesianQuality([], [], new LatLng(CartesianQuality.DEFAULT_SCALE, CartesianQuality.DEFAULT_SCALE));
        if (json.cartesianRainHistories) {
            created.cartesianRainHistories = json.cartesianRainHistories;
        }
        if (json.cartesianGaugeHistories) {
            created.cartesianGaugeHistories = json.cartesianGaugeHistories;
        }
        if (json.cartesianPixelWidth) {
            created.cartesianPixelWidth = json.cartesianPixelWidth;
        }
        return created;
    }

    private static storeDates(dates: { minDate: Date, maxDate: Date, stepInSec: number },
                              cartesianRainHistory: CartesianRainHistory): void {
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

    //  getGaugeLatLngFrom(position: Position): LatLng {
    //      this.cartesianRainHistories.filter(h => h.computedValue.lat);
    //      return new LatLng(position.x, position.y);
    //  }

    private static groupBy(x, f) {
        return x.reduce((a, b, i) => ((a[f(b, i, x)] ||= []).push(b), a), {});
    }


    public getRainDates(): Date[] {
        const rainHistoriesGroupByDate = CartesianQuality.groupBy(this.cartesianRainHistories, v => v.periodBegin.getTime());
        return Object.keys(rainHistoriesGroupByDate).map(d => new Date(parseInt(d, 10)));
    }

    public async getRainComputationQuality(dateToEvaluate: Date): Promise<RainComputationQuality> {

        const qualitiesFromDate = this.rainComputationQualities
            .filter(q => q.date.getTime() === dateToEvaluate.getTime());
        if (qualitiesFromDate.length === 1) {
            return qualitiesFromDate[0].rainComputationQuality;
        }

        // Filtering on the period TODO and null values ?
        const rainPeriodBegin = new Date(dateToEvaluate.getTime() + CartesianQuality.FILTER_PERIOD_START_MN * 60000);
        const gaugePeriodEnd = new Date(dateToEvaluate.getTime() + CartesianQuality.FILTER_PERIOD_END_MN * 60000);
        const cartesianRainHistories = this.cartesianRainHistories
            .filter(crh => {
                return rainPeriodBegin.getTime() <= crh.periodBegin.getTime() &&
                    crh.periodBegin.getTime() <= dateToEvaluate.getTime();
            });
        const cartesianGaugeHistories = this.cartesianGaugeHistories
            .filter(cgh => {
                return rainPeriodBegin.getTime() <= new Date(cgh.date).getTime() &&
                    new Date(cgh.date).getTime() <= gaugePeriodEnd.getTime();
            });

        let rainComputationQuality = new RainComputationQuality(
            'in progress...',
            null, null,
            [],
            0,
            'none',
            undefined);

        if (cartesianRainHistories.length === 0) {
            console.warn('>> raain-quality ### no cartesianRainHistory => impossible to compute quality');
            rainComputationQuality['id'] = 'no cartesianRainHistory';
            return rainComputationQuality;
        }
        if (cartesianGaugeHistories.length === 0) {
            console.warn('>> raain-quality ### no cartesianGaugeHistory => impossible to compute quality');
            rainComputationQuality['id'] = 'no cartesianGaugeHistory';
            return rainComputationQuality;
        }

        const dates = {minDate: undefined, maxDate: undefined, stepInSec: undefined};
        const beforeLaunching = new Date();

        const gaugeHistories = cartesianGaugeHistories
            .map(gh => {
                const position = Converter.MapLatLngToPosition(gh.value, true, this.cartesianPixelWidth);
                return new PositionHistory(gh.gaugeId, new Date(gh.date), position.x, position.y, gh.value.value);
            });
        const rainHistories = cartesianRainHistories
            .map((rh, index) => {
                CartesianQuality.storeDates(dates, rh);
                const position = Converter.MapLatLngToPosition(rh.computedValue, true, this.cartesianPixelWidth);
                return new PositionHistory('rain' + index,
                    new Date(rh.periodBegin),
                    position.x, position.y,
                    rh.computedValue.value);
            });

        const periodMinutes = Math.round(((dates.maxDate?.getTime() + dates.stepInSec * 1000) - dates.minDate?.getTime()) / 60000);
        const periodCount = Math.round(periodMinutes * 60 / dates.stepInSec);
        if (periodCount <= 0) {
            console.warn('>> raain-quality ### no period ', dates, '=> impossible to compute quality');
            rainComputationQuality['id'] = 'no period';
            return rainComputationQuality;
        }

        const speedComputing = new SpeedComputing(rainHistories, gaugeHistories,
            SpeedMatrix.DEFAULT_MATRIX_RANGE, this.cartesianPixelWidth);
        const speedMatrix = speedComputing.computeSpeedMatrix(dates.maxDate, {periodCount, periodMinutes});
        if (!speedMatrix) {
            throw new Error('impossible to compute Quality Speed Matrix');
        }

        rainComputationQuality = new RainComputationQuality(
            'qualityId' + new Date().toISOString(),
            dates.minDate, dates.maxDate,
            [],
            0,
            'v0.0.1'); // TODO align version
        rainComputationQuality.qualitySpeedMatrixContainer = new SpeedMatrixContainer([speedMatrix]);
        rainComputationQuality.timeSpentInMs = new Date().getTime() - beforeLaunching.getTime();

        this.rainComputationQualities.push({date: dateToEvaluate, rainComputationQuality});

        return rainComputationQuality;
    }

    toJSON() {
        return {
            cartesianRainHistories: this.cartesianRainHistories,
            cartesianGaugeHistories: this.cartesianGaugeHistories,
        };
    }

    logQualities(options?: { animate: boolean }) {

        const pass = new PassThrough();
        let matrixIndex = 0;
        const animationsObject = {};
        pass.on('data', (chunk) => {
            animationsObject[matrixIndex] =
                (animationsObject[matrixIndex] ? animationsObject[matrixIndex] : '') + chunk.toString();
        });
        const logger = new Console({stdout: pass, stderr: pass});

        for (const q of this.rainComputationQualities) {

            const container = q.rainComputationQuality.qualitySpeedMatrixContainer;
            for (const matrix of container.getMatrices()) {
                matrixIndex++;
                logger.log('date=', q.date.toISOString())
                matrix.logFlatten(logger, options?.animate);
            }
            // pass.resume();

            const quality = container.getQuality();
            // TODO logger.log('quality (ideal -> 0) :', quality);

            const qualityPoints = container.getQualityPoints();
            const qualityPointsToShow = {};
            const scale = 1000;
            for (const [index, qualityPoint] of qualityPoints.entries()) {
                qualityPointsToShow[qualityPoint.gaugeId] = {
                    gauge: Math.round(qualityPoint.gaugeCartesianValue.value * scale) / scale,
                    rain: Math.round(qualityPoint.rainCartesianValue.value * scale) / scale
                };
            }
            // TODO logger.table(qualityPointsToShow);

            const asciichart = require('asciichart');
            const s0 = new Array(120);
            for (let i = 0; i < s0.length; i++) {
                s0[i] = 15 * Math.sin(i * ((Math.PI * 4) / s0.length));
            }

            const s1 = new Array(120);
            for (let i = 0; i < s1.length; i++) {
                s1[i] = 15 * Math.cos(i * ((Math.PI * 4) / s0.length));
            }
            const config = {
                colors: [
                    asciichart.blue,
                    asciichart.green,
                    asciichart.default, // default color
                    undefined, // equivalent to default
                ]
            }
            // console.log(asciichart.plot([s0, s1], config));
        }

        if (options?.animate) {
// create animation instance
            const animation = new Animation({
                fps: 30,
                maxSize: {
                    width: 500,
                    height: 500,
                }
            });

            const cradle = animation.add({
                x: 0,
                y: 0,
                content: animationsObject[0],
                replaceSpace: true,
                color: 'blue'// 'cyan'
            });

            const intervalInMs = 3000;
            const transitions = [];
            for (const [key, value] of Object.entries(animationsObject)) {
                if (key !== '0') {
                    transitions.push({
                        props: {content: animationsObject[key]},
                        duration: intervalInMs
                    });
                }
            }

            const cradleFramesTransition = cradle.transition(transitions, {loop: true, loopInterval: intervalInMs});
            animation.start();
            cradleFramesTransition.run();
        } else {
            console.log(animationsObject);
        }
    }
}
