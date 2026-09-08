import {create} from 'zustand';
import {persist} from 'zustand/middleware';
//persist -> Save the state in localStorage and restore it after page refresh.
const useUserStore = create( 
    persist(
        (set)=>({
            //Zustand gives you a function:set() which updates the state.
            isAuthenticated:false,
            user:null,
            setUser:(data)=>set({user:userData,isAuthenticated:true}),
            clearUser:()=>set({user:null,isAuthenticated:false})
        }),
        {
            //This is the localStorage key. 
            //In browser storage you'll see:
// localStorage["Login-storage"] containing Zustand's saved data.
            name:"User-storage",
            getStorage:()=>localStorage
        }
    )
)

export default useUserStore;