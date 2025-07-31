import { createSlice } from '@reduxjs/toolkit';

export const uiSlice = createSlice({
	name: 'ui',
	initialState: {
		minutosperCita: 0,
		dataView: [],
		loading: false,
		viewSubTitle: '',
		cadenaBLOB: '',
		carrito: [],
		BLOB: {
			cadenaBLOB: '',
			FILE: {},
		},
	},
	reducers: {
		onSetCadenaBLOB: (state, { payload }) => {
			state.BLOB.cadenaBLOB = payload;
		},
		onClearFileBLOB: (state) => {
			state.BLOB.FILE = {};
		},
		onSetFileBLOB: (state, { payload }) => {
			state.BLOB.FILE = payload;
		},
		onSetData: (state, { payload }) => {
			state.dataView = payload;
		},
		RESET_DATA: () => {
			state.dataView = [];
		},
		onSetViewSubTitle: (state, { payload }) => {
			state.viewSubTitle = payload;
		},
		onSetMinPerCita: (state, { payload }) => {
			state.minutosperCita = payload;
		},
		onAddItemsCarrito: (state, { payload }) => {

			state.carrito = state.carrito.filter(
				(item) => `${item.uid}-${item.id_empl}` !== `${payload.uid}-${payload.id_empl}`
			);
			state.carrito = [...state.carrito, payload];
		},

		onDeleteItemCarrito: (state, { payload }) => {
			state.carrito = state.carrito.filter((item) => item.uid !== payload);
		},
		onOneItemCarrito: (state, { payload }) => {
			state.carrito = state.carrito.filter((item) => item.uid == payload);
		},
		onSelectItemCarrito: (state, { payload }) => {
			state.carrito = state.carrito.map((item) =>
				item.id === payload.id ? { ...item, selected: payload.selected } : item
			);
		},

		RESET_ItemsCarrito: (state, { payload }) => {
			state.carrito = [];
		},
	},
});
export const {
	onSetData,
	RESET_ItemsCarrito,
	onAddItemsCarrito,
	onSetMinPerCita,
	onSetViewSubTitle,
	onSetCadenaBLOB,
	onSetFileBLOB,
	onClearFileBLOB,
	onDeleteItemCarrito,
	onSelectItemCarrito,
	onOneItemCarrito,
} = uiSlice.actions;
