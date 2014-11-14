/*****************************************************************************
 *
 * Copyright (C) Zenoss, Inc. 2014, all rights reserved.
 *
 * This content is made available according to terms specified in
 * License.zenoss under the directory where your Zenoss product is installed.
 *
 ****************************************************************************/
(function(){
    Ext.Loader.setConfig({
	enabled: true,
    });

    Ext.application({
        name: 'Zenoss.Dashboard',
        appFolder: "/++resource++dashboard/js/",
        controllers: ['DashboardController'],
        currentStep: 0,
        launch: function() {
            var panel = {
                id: 'app-portal',
                xtype: 'dashboardpanel'
            };

            Ext.getCmp('center_panel').add(panel);
            window.globalApp = this;
        },
        setupEvents: function() {

        }
    });
})();
