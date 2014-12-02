#
# Copyright (C) Zenoss, Inc. 2014, all rights reserved.
#
# This content is made available according to terms specified in
# License.zenoss under the directory where your Zenoss product is installed.
#


from Products.ZenModel.ZenModelRM import ZenModelRM
from Products.ZenRelations.RelSchema import ToOne, ToManyCont


class Dashboard(ZenModelRM):

    name = ""
    owner = ""
    columns = 3
    state = ""

    _properties =  (
        {'id':'name', 'type':'string', 'mode':'w'},
        {'id':'owner', 'type':'string', 'mode':'w'},
        {'id':'columns', 'type':'integer', 'mode':'w'},
        {'id':'state', 'type':'string', 'mode':'w'},
    )


    _relations = (
        ("userSetting", ToOne(ToManyCont, "Products.ZenModel.UserSettings.UserSettings", "dashboards")),
        ("userSettingManager", ToOne(ToManyCont, "Products.ZenModel.UserSettings.UserSettingsManager", "dashboards")),
    )

    def getContext(self):
        if self.userSettingManager():
            return self.userSettingManager()
        return self.userSetting()
