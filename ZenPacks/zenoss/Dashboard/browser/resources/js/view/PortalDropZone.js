/**
 * @class Zenoss.Dashboard.view.PortalDropZone
 * @extends Ext.dd.DropTarget
 * Internal class that manages drag/drop for {@link Ext.app.PortalPanel}.
 */
Ext.define('Zenoss.Dashboard.view.PortalDropZone', {
    extend: 'Ext.dd.DropTarget',

    ddScrollConfig: {
        vthresh: 50,
        hthresh: -1,
        animate: true,
        increment: 200
    },

    constructor: function (dashboard, cfg) {
        this.dashboard = dashboard;
        Ext.dd.ScrollManager.register(dashboard.body);
        dashboard.body.ddScrollConfig = this.ddScrollConfig;

        this.callParent([dashboard.body, cfg]);
    },

    getOverEvent: function (dd, e, data) {
        var dashboard = this.dashboard,
            dbody = dashboard.body,
            items = dashboard.items.items,
            scroll = dbody.getScroll(),
            bodyBox = dbody.getBox(),
            count = items.length,
            xy = e.getXY(),
            x = xy[0] - bodyBox.x + scroll.left,
            y = xy[1] - bodyBox.y + scroll.top,
            colRegion, colBox,
            // top, right, bottom, left
            pointRegion = new Ext.util.Region(xy[1], xy[0]+50, xy[1]+50, xy[0]),
            over = {
                columnIndex: 0,
                column: null,
                dashboard: dashboard,
                above: null,
                extensible: false,
                beforeAfter: 0,
                data: data,
                panel: data.panel,
                rawEvent: e,
                source: dd,
                status: this.dropAllowed
            },
            t, ht, i, k, item, w, childCount, childItems, childItem;

        for (i = 0; i < count; i += 2) {
            item = items[i];
            w = item.lastBox.width;
            colBox = item.getBox();
            if (items[i+1]) {
                w += items[i+1].lastBox.width;
            }
            // colRegion = item.getEl().getRegion();
            // create column region from column lastBox width/height and current box x/y
            // because when we start dragging item it became ghost and column lose dimensions
            colRegion = new Ext.util.Region(colBox.y, colBox.x+item.lastBox.width, colBox.y+item.lastBox.height, colBox.x);
            if (colRegion.contains(pointRegion)) {
                over.columnIndex = i;
                over.column = item;
                over.extensible = this.isRowExtensible(item.rowIndex);
                // 200 - default threshold  when we want to create new column;
                t = Math.min(200, w * 0.2);
                over.beforeAfter = t = (over.extensible && ((x < t) ? -1 : ((x > w - t) ? 1 : 0)));

                if (!t || !over.extensible) {
                    childItems = item.items.items;
                    // if we are not on an edge OR reached maxColumns (which means "insert the panel in
                    // between the columns"), we need to dig one more level down
                    for (k = 0, childCount = childItems.length; k < childCount; ++k) {
                        childItem = childItems[k];
                        ht = childItem.el.getHeight();
                        if (y < ht / 2) {
                            // if mouse is above the current child's top, Y coord, it
                            // is considered as "above" the previous child
                            over.above = childItem;
                            break;
                        }
                        y -= ht;
                    }
                }
                break;
            }
            x -= w;
        }
        return over;
    },

    notifyOver: function(dd, e, data) {
        // disallow dragging the dashboard if it is locked
        var dashboard = window.globalApp.getController("DashboardController").getCurrentDashboard();
        if (dashboard && dashboard.get('locked')) {
            return this.dropNotAllowed;
        }
        var me = this,
            dashboard = me.dashboard,
            over = me.getOverEvent(dd, e, data),
            colEl = over.column && over.column.el,
            proxy = dd.proxy,
            proxyProxy,
            aboveItem = over.above,
            colWidth, width = 0,
            padding,
            scrollWidth,
            hasListeners = dashboard.hasListeners;

        data.lastOver = over;

        if ((!hasListeners.validatedrop || dashboard.fireEvent('validatedrop', over) !== false) &&
            (!hasListeners.beforedragover || dashboard.fireEvent('beforedragover', over) !== false ))
            {

            proxyProxy = dd.panelProxy.getProxy();
            // make sure proxy width is fluid in different width columns
            proxy.getProxy().setWidth('auto');

            if (colEl) {
                width = colWidth = colEl.getWidth();
                // A floating column was targeted
                if (over.beforeAfter) {
                    dd.panelProxy.moveProxy(colEl.dom, colEl.dom.firstChild);

                    width = colWidth / 2;
                    proxyProxy.setWidth(width);

                } else {
                    if (aboveItem) {
                        dd.panelProxy.moveProxy(aboveItem.el.dom.parentNode, aboveItem.el.dom);
                    } else {
                        dd.panelProxy.moveProxy(colEl.dom, null);
                    }
                    proxyProxy.setWidth('auto');

                }
                proxyProxy.setStyle({
                    'float': 'none',
                    'clear' : 'none',
                    'margin-left': (over.beforeAfter > 0) ? (colWidth - width - colEl.getPadding('lr')) + 'px' : ''
                });
            } else {
                padding = dashboard.body.getPadding('lr');
                scrollWidth = dashboard.body.isScrollable() ? Ext.getScrollBarWidth() : 0;
                proxyProxy.setStyle({
                    'float' : 'left',
                    'clear' : 'left'
                });
                proxyProxy.setWidth(dashboard.body.getWidth() - padding - scrollWidth);
                // Target the innerCt for the move
                dd.panelProxy.moveProxy(dashboard.body.dom.firstChild.lastChild, null);
            }
            this.scrollPos = dashboard.body.getScroll();

            if (hasListeners.dragover) {
                dashboard.fireEvent('dragover', over);
            }
        }

        return over.status;
    },

    isRowExtensible : function(rowIndex) {
        var me = this,
            dashboard = me.dashboard,
            maxColumns = dashboard.getMaxColumns() || 1;

        return Ext.Array.from(dashboard.query('>portalcolumn[rowIndex=' + rowIndex + ']')).length < maxColumns;
    },

    notifyDrop: function (dd, e, data) {
        this.callParent(arguments);
        if (!data.lastOver) return false;

        var dashboard = this.dashboard,
            over = data.lastOver,
            panel = over.panel,
            fromCt = panel.ownerCt,
            toCt = over.column,
            side = toCt ? over.beforeAfter : 1,
            currentIndex = fromCt.items.indexOf(panel),
            newIndex = toCt ? (over.above ? toCt.items.indexOf(over.above) : toCt.items.getCount()) : 0,
            colIndex, newCol,
            hasListeners = dashboard.hasListeners;

        //Same column tests
        if (fromCt === toCt) {
            if (fromCt.items.getCount() === 1) {
                return;
            }
            if (!side) {
                if (currentIndex < newIndex) {
                    --newIndex;
                }
                if (currentIndex === newIndex) {
                    return;
                }
            }
        }

        if ((hasListeners.validatedrop && dashboard.fireEvent('validatedrop', over) === false) ||
            (hasListeners.beforedrop && dashboard.fireEvent('beforedrop', over) === false)) {
            return;
        }

        Ext.suspendLayouts();

        panel.isMoving = true;
        if (side) {
            colIndex = dashboard.items.indexOf(toCt);

            // inserting into new Row ?
            if (colIndex < 0) {
                colIndex = dashboard.items.getCount();
            } else if (side > 0) {
                ++colIndex;
            }

            newCol = dashboard.createColumn();

            if (toCt) {
                newCol.columnWidth = toCt.columnWidth = toCt.columnWidth / 2;
                delete toCt.width;
            } else {
                newCol.columnWidth = 1;  //full row
            }

            toCt = dashboard.insert(colIndex, newCol);
            newIndex = 0;
        }

        // make sure panel is visible prior to inserting so the layout doesn't ignore it
        panel.el.dom.style.display = '';

        toCt.insert(newIndex, panel);

        panel.isMoving = false;

        toCt.updateLayout();
        Ext.resumeLayouts(true);

        if (hasListeners.drop) {
            dashboard.fireEvent('drop', over);
        }
    },

    // unregister the dropzone from ScrollManager
    unreg: function() {
        Ext.dd.ScrollManager.unregister(this.dashboard.body);
        Zenoss.Dashboard.view.PortalDropZone.superclass.unreg.call(this);
    }
});