import { configureStore } from "@reduxjs/toolkit";
import filterSlice from "../redux/filter-slice";
import menuSlice from "../redux/menu-slice";
import sideMenuSlice from "../redux/side-menu-slice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      menu: menuSlice,
      filter: filterSlice,
      sideMenu: sideMenuSlice,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
