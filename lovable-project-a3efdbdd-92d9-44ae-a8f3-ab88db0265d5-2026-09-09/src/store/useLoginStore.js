import {create} from 'zustand';
import {persist} from 'zustand/middleware';
//persist -> Save the state in localStorage and restore it after page refresh.
const useLoginStore = create( 
    persist(
        (set)=>({
            //Zustand gives you a function:set() which updates the state.
            steps:1,
            userPhoneData:null,
            setSteps:(steps)=>set({steps}),
            setUserPhoneData: (data)=>set({userPhoneData:data}),
            resetLoginState:()=>set({steps:1,userPhoneData:null})
        }),
        {
            //This is the localStorage key. 
            //In browser storage you'll see:
// localStorage["Login-storage"] containing Zustand's saved data.
            name:"Login-storage",
            partialize:(state)=>({
                //This decides what should be saved. Not all the data is saved. 
                // Only the step and user phone data columns are saved in the local storage. 
                steps:state.steps,
                userPhoneData:state.userPhoneData
            })
        }
    )
)

export default useLoginStore