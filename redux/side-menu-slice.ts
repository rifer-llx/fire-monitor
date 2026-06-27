import { createSlice } from "@reduxjs/toolkit";

interface SideMenuState {
  isOpen: boolean;
}

const initialState: SideMenuState = {
  isOpen: false,
};

const sideMenuSlice = createSlice({
  name: "sideMenu",
  initialState,
  reducers: {
    toggleSideMenu: (state) => {
      state.isOpen = !state.isOpen;
    },
    openSideMenu: (state) => {
      state.isOpen = true;
    },
    closeSideMenu: (state) => {
      state.isOpen = false;
    },
  },
});

export const { toggleSideMenu, openSideMenu, closeSideMenu } = sideMenuSlice.actions;
export default sideMenuSlice.reducer;
