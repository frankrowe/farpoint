package com.farpoint;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.imagepicker.ImagePickerPackage;
import com.mapbox.reactnativemapboxgl.ReactNativeMapboxGLPackage;
import com.oblador.vectoricons.VectorIconsPackage;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import io.realm.react.RealmReactPackage;

public class MainActivity extends ReactActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "FarPoint";
    }

//    @Override
//    protected boolean getUseDeveloperSupport() {
//        return false;
//    }
//
//    @Override
//    protected List<ReactPackage> getPackages() {
//        return Arrays.<ReactPackage>asList(
//                new MainReactPackage(),
//                new VectorIconsPackage(),
//                new ReactNativeMapboxGLPackage(),
//                new ImagePickerPackage(),
//                new RealmReactPackage()
//        );
//
//    }
}
