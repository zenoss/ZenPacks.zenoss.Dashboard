Ext.define('Zenoss.Dashboard.model.ChartStock', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'name'},
        {name: 'sp500',     type: 'float'},
        {name: 'djia',  type: 'float'}
    ]
});
