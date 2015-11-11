##############################################################################
#
# Copyright (C) Zenoss, Inc. 2014, all rights reserved.
#
# This content is made available according to terms specified in
# License.zenoss under the directory where your Zenoss product is installed.
#
##############################################################################
from Acquisition import aq_base
from zope.interface import implements
from zope.component import getMultiAdapter
from Products.Zuul.interfaces import IFacade, IInfo, ICatalogTool, template as templateInterfaces
from Products.ZenUtils.guid.interfaces import IGUIDManager
from Products.Zuul.facades import ZuulFacade
from Products.Zuul import getFacade
from Products.ZenModel.Device import Device
from Products.ZenUtils import NetworkTree
from Products.ZenModel.DataPointGraphPoint import DataPointGraphPoint
from Products.ZenModel.DeviceOrganizer import DeviceOrganizer
from ZenPacks.zenoss.Dashboard.Dashboard import Dashboard
from Products.ZenModel.ZenossSecurity import ZEN_VIEW
from Products.ZenEvents.HeartbeatUtils import getHeartbeatObjects
from Products.AdvancedQuery import MatchRegexp

class IDashboardFacade(IFacade):
    """
    A facade for the dashboards
    """
    pass

class DashboardFacade(ZuulFacade):
    implements(IDashboardFacade)

    def _getContext(self, uid):
        # special token meaning add it to the current user
        if uid == "current_user":
            obj = self._dmd.ZenUsers.getUserSettings()
        else:
            obj = self._getObject(uid)
        return obj

    def addDashboard(self, newId, uid, columns, state=None):
        """
        newId is the name of the dashboard
        uid is the context on which the dashboard appears. ZenUsers, UserSetings or GroupSettings
        """
        obj = self._getContext(uid)
        d = Dashboard(newId)
        d.columns = columns
        user = self._dmd.ZenUsers.getUserSettings()
        d.owner = user.id
        d.state = state
        obj.dashboards._setObject(newId, d)

    def saveDashboard(self, data):
        """
        Need to do the following
        1. Rename the dashboard if the name changed
        2. move the dashboash if the context changed
        3. call regular set info to save properties
        """
        # will fail if the uid isn't passed in
        uid = data['uid']
        del data['uid']
        d = self._getObject(uid)

        # 1. rename dashboard
        if data['newId'] != d.id:
            IInfo(d).rename(data['newId'])

        # 2. move object if context changed
        newContext = self._getContext(data['contextUid'])
        del data['contextUid']
        if newContext != d.getContext():
            oldContext = d.getContext()
            oldContext.dashboards._delObject(d.id)
            d = aq_base(d)
            newContext.dashboards._setObject(d.id, d)
            # fetch the object in the new context
            d = newContext.dashboards._getOb(d.id)

        # 3. save the rest of the data
        self.setInfo(d.getPrimaryId(), data)
        return IInfo(d)

    def saveDashboardState(self, uid, state):
        dashboard = self._getObject(uid)
        if dashboard.state != state:
            dashboard.state = state

    def getAvailableDashboards(self):
        """
        Available dashboards come from three places

        1. Global (they are on dmd.ZenUsers)
        2. The User Groups current user belongs to
        3. Any exclusive to that user
        """
        dashboards = []
        user = self._dmd.ZenUsers.getUserSettings()

        # 1. Global Dashboards
        dashboards.extend([IInfo(d) for d in self._dmd.ZenUsers.dashboards()])

        # 2. Dashboards defined on my groups
        for name in user.getUserGroupSettingsNames():
            group = self._dmd.ZenUsers.getGroupSettings(name)
            dashboards.extend([IInfo(d) for d in group.dashboards()])

        # 3. My dashboards
        dashboards.extend([IInfo(d) for d in user.dashboards()])

        return dashboards

    def getCurrentUsersGroups(self):
        results = []
        user = self._dmd.ZenUsers.getUserSettings()
        for name in user.getUserGroupSettingsNames():
            group = self._dmd.ZenUsers.getGroupSettings(name)
            results.append(dict(uid=group.getPrimaryId(), name=group.id))
        return results

    def _getFullOrganizerName(self, obj):
        rootName = obj.dmdRootName
        return "/%s%s" % (rootName, obj.getOrganizerName())

    def getSubOrganizers(self, uid):
        results = []
        obj = self._getObject(uid or "/zport/dmd")
        searchresults = ICatalogTool(obj).search(DeviceOrganizer)
        if isinstance(obj, DeviceOrganizer):
            info = IInfo(obj)
            info.fullOrganizerName = self._getFullOrganizerName(obj)
            results.append(info)
        for brain in searchresults:
            try:
                org = brain.getObject()
                info = IInfo(org)
                info.fullOrganizerName = self._getFullOrganizerName(org)
                results.append(info)
            except:
                # error unbraining the object just skip it
                pass
        return results

    def getTopLevelOrganizers(self, uid):
        results = []
        obj = self._getObject(uid or "/zport/dmd")
        searchresults = ICatalogTool(obj).search(DeviceOrganizer)
        for brain in searchresults:
            try:
                org = brain.getObject()
                if org.children():
                    continue
                info = IInfo(org)
                info.fullOrganizerName = self._getFullOrganizerName(org)
                results.append(info)
            except:
                # error unbraining the object just skip it
                pass
        return results

    def getWatchListTargets(self, uid, query=""):
        results = self.getSubOrganizers(uid)
        if query:
            results = [o for o in results if query.lower() in o.fullOrganizerName.lower()]
            queryResults = self._dmd.Devices.deviceSearch.evalAdvancedQuery(MatchRegexp("titleOrId", ".*" + query + ".*"))
        else:
            queryResults = self._dmd.Devices.deviceSearch()
        results.extend([IInfo(o.getObject()) for o in queryResults[:50]])
        return results

    def getDeviceIssues(self):
        zep = getFacade('zep', self._dmd)
        manager = IGUIDManager(self._dmd)
        deviceSeverities = zep.getDeviceIssuesDict()
        zem = self.context.dmd.ZenEventManager
        devdata = []
        # only get the first 100 since this is just the portlet
        for uuid in deviceSeverities.keys()[:100]:
            dev = manager.getObject(uuid)
            if dev and isinstance(dev, Device):
                if (not zem.checkRemotePerm(ZEN_VIEW, dev)
                    or dev.productionState < zem.prodStateDashboardThresh
                    or dev.priority < zem.priorityDashboardThresh):
                    continue
                severities = deviceSeverities[uuid]
                info = IInfo(dev)
                info.setEventSeverities(severities)
                devdata.append(info)
        return devdata

    def getDaemonProcessesDown(self):
        return getHeartbeatObjects(deviceRoot=self._dmd.Devices,
                                   keys=['host', 'process', 'secondsDown', 'monitor'])

    def getDeviceClassGraphPoints(self, deviceClassName):
        """
        Expects a device class organizer name and returns a list of graph points

        This is used by the device chart portlet
        """
        deviceClass = self._dmd.Devices.getOrganizer(deviceClassName)
        results = []
        for rrdTemplate in getFacade('device', self._dmd).getBoundTemplates(deviceClass.getPrimaryId()):
            for graphDefinition in rrdTemplate.graphDefs():
                for graphPoint in graphDefinition.graphPoints():
                    # complex or thresholds can't really be graphed at this point
                    if not isinstance(graphPoint, DataPointGraphPoint):
                        continue
                    results.append({
                        'name': "%s ( %s/%s )" % (graphPoint.id, rrdTemplate.id, graphDefinition.id),
                        'uid': graphPoint.getPrimaryId()
                    })
        return results


    def getDeviceClassGraphDefinition(self, deviceClassName, graphPointsUids):
        deviceClass = self._dmd.Devices.getOrganizer(deviceClassName)
        # grab the first then so we don't clutter the graph.
        # TODO: Show the nth top or bottom devices based on a query to the metric service
        devices = deviceClass.devices()[:10]
        results = []
        for uid in graphPointsUids:
            gp = self._getObject(uid)
            for device in devices:
                if device.checkRemotePerm(ZEN_VIEW, device):
                    results.append(getMultiAdapter((gp, device), templateInterfaces.IMetricServiceGraphPoint))
        # let the graph points know that they need the device name in the legend and to ignore the graph point color
        for info in results:
            info.setMultiContext()
        return results

    def getNetworks(self):
        root = self._dmd.Networks
        return [IInfo(network) for network in root.getSubNetworks()]

    def getNetworkMapData(self, uid, depth=2):
        obj = self._getObject(uid)
        edges = list(NetworkTree.get_edges(obj, depth=depth, withIcons=True))
        nodes = []
        links = []
        for a, b in edges:
            node1 =  {
                'id': a[0],
                'prop': a[0],
                'icon': a[1],
                'color': a[2]
            }
            node2 = {
                'id': b[0],
                'prop': b[0],
                'icon': b[1],
                'color': b[2]
            }
            link = {
                'source': a[0],
                'target': b[0]
            }
            if node1 not in nodes: nodes.append(node1)
            if node2 not in nodes: nodes.append(node2)
            if link not in links: links.append(link)
        return dict(links=links, nodes=nodes)
