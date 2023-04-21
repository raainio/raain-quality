export class QualityTools {

    public static indexOfDualArray(array, itemToFind) {
        for (const [index, value] of array.entries()) {
            if (value[0] === itemToFind[0] && value[1] === itemToFind[1]) {
                return index;
            }
        }
        return -1;
    }

    public static roundLatLng(value: number, cartesianStep = 0.01): number {
        return Math.round(value / cartesianStep) * cartesianStep;
    }

    public static isEqualsLatLng(value1: number, value2: number, cartesianStep = 0.01): boolean {
        return QualityTools.roundLatLng(value1, cartesianStep) === QualityTools.roundLatLng(value2, cartesianStep);
    }


}