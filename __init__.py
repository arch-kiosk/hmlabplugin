# *******************************************
# hmlab.__init__.py
#
# ********************************************
import logging
import sys

import kioskglobals

if "mcpcore.mcpworker" not in sys.modules:
    from flask_allows import guard_entire

    from core.authorization import IsAuthorized, ENTER_ADMINISTRATION_PRIVILEGE, DOWNLOAD_WORKSTATION, \
        SYNCHRONIZE, CREATE_WORKSTATION
    from core.kioskcontrollerplugin import KioskControllerPlugin
    from kioskmenuitem import KioskMenuItem
    from .hmlabcontroller import hmlab
    from .hmlabcontroller import hm_lab_index
    from .hmlabcontroller import plugin_version

    from flask_login import current_user

    plugin: KioskControllerPlugin = None


    def instantiate_plugin_object(name, package, init_plugin_configuration={}):
        return KioskControllerPlugin(name, package, plugin_version=plugin_version)


    def init_app(app, api=None):
        if not kioskglobals.get_development_option("webapp_development").lower() == "true":
            hmlab.before_request(guard_entire([IsAuthorized(DOWNLOAD_WORKSTATION)]))

        app.register_blueprint(hmlab)

        # print("init_app on hmlab called")
        # if api:
        #     # register_api(api)
        #     return True
        # else:
        #     logging.error("hmlab/package.init_app: api is None.")
        #     print("hmlab/package.init_app - Error: api is None.")
        #     return False


    # def register_api(api):
    #     register_resources(api)
    #     print(f"api /api/hmlab initialized.")


    def register_plugin_instance(plugin_to_register):
        global plugin
        plugin = plugin_to_register


    def all_plugins_ready():
        global plugin
        if plugin.is_main_index:
            asterisk = "*"
        else:
            asterisk = ""

        print("All the plugins are ready. This here is plugin {}{}".format(asterisk, plugin.name))


    def register_index(app):
        app.add_url_rule('/', 'get_index', hm_lab_index)


    def register_menus():
        global plugin
        return [KioskMenuItem(name="stratigraphy studio",
                              onclick="triggerModule('hmlab.hm_lab_show')",
                              endpoint="hmlab.hm_lab_show",
                              is_active=lambda: current_user.fulfills_requirement(
                                  ENTER_ADMINISTRATION_PRIVILEGE) if hasattr(current_user,
                                                                             "fulfills_requirement") else True,
                              menu_cfg=plugin.get_menu_config(),
                              order="zzz"),
                ]


    def register_global_routes():
        global plugin
        return ["hmlab.static", ]


    def register_global_scripts():
        return {"hmlab": ["hmlab.static", "scripts/hmlab.js", "async"]}
