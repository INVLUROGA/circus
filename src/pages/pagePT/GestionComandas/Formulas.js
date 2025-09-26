export const Formulas = () => {
	const openPay = (monto) => {
		return monto * (5 / 100);
	};
	const igv = (monto) => {
		return monto - monto / 1.18;
	};
	const impRenta = (monto) => {
		return (monto - igv(monto)) * (2 / 100);
	};
	return {
		impRenta,
		igv,
		openPay,
	};
};
