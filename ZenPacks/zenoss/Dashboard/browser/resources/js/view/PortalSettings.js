Ext.define('Zenoss.Dashboard.view.PortalSettings', {
    extend: 'Ext.panel.Panel',

    alias: 'widget.portalsettings',

    initComponent: function() {

        Ext.applyIf(this, {
            collapsible: true,
            collapsed: true,
            title: _t('Settings'),
            items: [{
                html: 'test'
            }]

        });

        this.callParent(arguments);
    }
});
