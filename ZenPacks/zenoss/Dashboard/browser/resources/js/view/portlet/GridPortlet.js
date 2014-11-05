Ext.define('Zenoss.Dashboard.view.portlet.GridPortlet', {
    extend: 'Zenoss.Dashboard.view.Portlet',
    alias: 'widget.gridportlet',
    alternateClassName: ['Zenoss.Dashboard.portlets.GridPortlet'],
    height: 300,

    /**
     * Custom function used for column renderer
     * @param {Object} val
     */
    change: function(val) {
        if (val > 0) {
            return '<span style="color:green;">' + val + '</span>';
        } else if (val < 0) {
            return '<span style="color:red;">' + val + '</span>';
        }
        return val;
    },

    /**
     * Custom function used for column renderer
     * @param {Object} val
     */
    pctChange: function(val) {
        if (val > 0) {
            return '<span style="color:green;">' + val + '%</span>';
        } else if (val < 0) {
            return '<span style="color:red;">' + val + '%</span>';
        }
        return val;
    },

    initComponent: function(){

        var store = Ext.create('Zenoss.Dashboard.store.Stocks');

        Ext.apply(this, {
            items: [{
                height: this.height,
                xtype: 'grid',
                store: store,
                stripeRows: true,
                columnLines: true,
                columns: [{
                    text   : 'Company',
                    flex: 1,
                    sortable : true,
                    dataIndex: 'company'
                },{
                    text   : 'Change',
                    width    : 75,
                    sortable : true,
                    renderer : this.change,
                    dataIndex: 'change'
                },{
                    text   : '% Change',
                    width    : 75,
                    sortable : true,
                    renderer : this.pctChange,
                    dataIndex: 'pctChange'
                }]
            } ]
        });

        this.callParent(arguments);
    }
});
