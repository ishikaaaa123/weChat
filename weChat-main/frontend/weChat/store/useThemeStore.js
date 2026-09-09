import {create} from 'zustand';
import {persist} from 'zustand/middleware';
//persist -> Save the state in localStorage and restore it after page refresh.
const useThemeStore = create( 
    persist(
        (set)=>({
            //Zustand gives you a function:set() which updates the state.
            theme:"light",
            setTheme:(theme)=>set({theme}),
        }),
        {
            //This is the localStorage key. 
            //In browser storage you'll see:
// localStorage["Login-storage"] containing Zustand's saved data.
            name:"theme-storage",
        }
    )
)

export default useThemeStore