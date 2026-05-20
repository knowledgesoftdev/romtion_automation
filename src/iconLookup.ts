/**
 * src/iconLookup.ts
 *
 * Mapa estático de iconos Flat Color Icons pre-bundleados localmente para que el
 * render headless de Remotion no dependa del CDN de Iconify. Si más adelante se
 * agregan iconos a ALLOWED_ICONS en smartParser.js, agregarlos aquí también.
 */

import type { IconifyIcon } from "@iconify/react";

import approve              from "@iconify-icons/flat-color-icons/approve";
import cancel               from "@iconify-icons/flat-color-icons/cancel";
import alarm_clock          from "@iconify-icons/flat-color-icons/alarm-clock";
import area_chart           from "@iconify-icons/flat-color-icons/area-chart";
import bar_chart            from "@iconify-icons/flat-color-icons/bar-chart";
import line_chart           from "@iconify-icons/flat-color-icons/line-chart";
import pie_chart            from "@iconify-icons/flat-color-icons/pie-chart";
import positive_dynamic     from "@iconify-icons/flat-color-icons/positive-dynamic";
import negative_dynamic     from "@iconify-icons/flat-color-icons/negative-dynamic";
import businessman          from "@iconify-icons/flat-color-icons/businessman";
import businesswoman        from "@iconify-icons/flat-color-icons/businesswoman";
import business             from "@iconify-icons/flat-color-icons/business";
import briefcase            from "@iconify-icons/flat-color-icons/briefcase";
import business_contact     from "@iconify-icons/flat-color-icons/business-contact";
import calculator           from "@iconify-icons/flat-color-icons/calculator";
import calendar             from "@iconify-icons/flat-color-icons/calendar";
import cell_phone           from "@iconify-icons/flat-color-icons/cell-phone";
import iphone               from "@iconify-icons/flat-color-icons/iphone";
import smartphone_tablet    from "@iconify-icons/flat-color-icons/smartphone-tablet";
import multiple_smartphones from "@iconify-icons/flat-color-icons/multiple-smartphones";
import tablet_android       from "@iconify-icons/flat-color-icons/tablet-android";
import multiple_devices     from "@iconify-icons/flat-color-icons/multiple-devices";
import display              from "@iconify-icons/flat-color-icons/display";
import command_line         from "@iconify-icons/flat-color-icons/command-line";
import document             from "@iconify-icons/flat-color-icons/document";
import dl_download          from "@iconify-icons/flat-color-icons/download";
import upload               from "@iconify-icons/flat-color-icons/upload";
import engineering          from "@iconify-icons/flat-color-icons/engineering";
import factory              from "@iconify-icons/flat-color-icons/factory";
import factory_breakdown    from "@iconify-icons/flat-color-icons/factory-breakdown";
import globe                from "@iconify-icons/flat-color-icons/globe";
import home                 from "@iconify-icons/flat-color-icons/home";
import idea                 from "@iconify-icons/flat-color-icons/idea";
import settings             from "@iconify-icons/flat-color-icons/settings";
import lock_icon            from "@iconify-icons/flat-color-icons/lock";
import unlock               from "@iconify-icons/flat-color-icons/unlock";
import key                  from "@iconify-icons/flat-color-icons/key";
import link                 from "@iconify-icons/flat-color-icons/link";
import money_transfer       from "@iconify-icons/flat-color-icons/money-transfer";
import currency_exchange    from "@iconify-icons/flat-color-icons/currency-exchange";
import debt                 from "@iconify-icons/flat-color-icons/debt";
import paid                 from "@iconify-icons/flat-color-icons/paid";
import donate               from "@iconify-icons/flat-color-icons/donate";
import news                 from "@iconify-icons/flat-color-icons/news";
import rating               from "@iconify-icons/flat-color-icons/rating";
import like                 from "@iconify-icons/flat-color-icons/like";
import dislike              from "@iconify-icons/flat-color-icons/dislike";
import search               from "@iconify-icons/flat-color-icons/search";
import no_idea              from "@iconify-icons/flat-color-icons/no-idea";
import google_icon          from "@iconify-icons/flat-color-icons/google";
import linux                from "@iconify-icons/flat-color-icons/linux";
import wikipedia            from "@iconify-icons/flat-color-icons/wikipedia";
import wifi_logo            from "@iconify-icons/flat-color-icons/wi-fi-logo";
import checkmark            from "@iconify-icons/flat-color-icons/checkmark";
import ok                   from "@iconify-icons/flat-color-icons/ok";
import plus                 from "@iconify-icons/flat-color-icons/plus";
import minus                from "@iconify-icons/flat-color-icons/minus";
import next_icon            from "@iconify-icons/flat-color-icons/next";
import previous_icon        from "@iconify-icons/flat-color-icons/previous";
import share                from "@iconify-icons/flat-color-icons/share";
import start                from "@iconify-icons/flat-color-icons/start";
import process_icon         from "@iconify-icons/flat-color-icons/process";
import sim_card_chip        from "@iconify-icons/flat-color-icons/sim-card-chip";
import flash_on             from "@iconify-icons/flat-color-icons/flash-on";
import electricity          from "@iconify-icons/flat-color-icons/electricity";
import electronics          from "@iconify-icons/flat-color-icons/electronics";
import integrated_webcam    from "@iconify-icons/flat-color-icons/integrated-webcam";
import gallery              from "@iconify-icons/flat-color-icons/gallery";
import picture              from "@iconify-icons/flat-color-icons/picture";
import video_file           from "@iconify-icons/flat-color-icons/video-file";
import image_file           from "@iconify-icons/flat-color-icons/image-file";
import audio_file           from "@iconify-icons/flat-color-icons/audio-file";
import film_reel            from "@iconify-icons/flat-color-icons/film-reel";
import music                from "@iconify-icons/flat-color-icons/music";
import expired              from "@iconify-icons/flat-color-icons/expired";
import safe                 from "@iconify-icons/flat-color-icons/safe";
import trademark            from "@iconify-icons/flat-color-icons/trademark";
import copyright            from "@iconify-icons/flat-color-icons/copyright";
import signature            from "@iconify-icons/flat-color-icons/signature";
import graduation_cap       from "@iconify-icons/flat-color-icons/graduation-cap";
import diploma_1            from "@iconify-icons/flat-color-icons/diploma-1";
import rules                from "@iconify-icons/flat-color-icons/rules";
import decision             from "@iconify-icons/flat-color-icons/decision";
import make_decision        from "@iconify-icons/flat-color-icons/make-decision";
import statistics           from "@iconify-icons/flat-color-icons/statistics";
import timeline             from "@iconify-icons/flat-color-icons/timeline";

export const FCI_ICONS: Record<string, IconifyIcon> = {
  "flat-color-icons:approve":              approve,
  "flat-color-icons:cancel":               cancel,
  "flat-color-icons:alarm-clock":          alarm_clock,
  "flat-color-icons:area-chart":           area_chart,
  "flat-color-icons:bar-chart":            bar_chart,
  "flat-color-icons:line-chart":           line_chart,
  "flat-color-icons:pie-chart":            pie_chart,
  "flat-color-icons:positive-dynamic":     positive_dynamic,
  "flat-color-icons:negative-dynamic":     negative_dynamic,
  "flat-color-icons:businessman":          businessman,
  "flat-color-icons:businesswoman":        businesswoman,
  "flat-color-icons:business":             business,
  "flat-color-icons:briefcase":            briefcase,
  "flat-color-icons:business-contact":     business_contact,
  "flat-color-icons:calculator":           calculator,
  "flat-color-icons:calendar":             calendar,
  "flat-color-icons:cell-phone":           cell_phone,
  "flat-color-icons:iphone":               iphone,
  "flat-color-icons:smartphone-tablet":    smartphone_tablet,
  "flat-color-icons:multiple-smartphones": multiple_smartphones,
  "flat-color-icons:tablet-android":       tablet_android,
  "flat-color-icons:multiple-devices":     multiple_devices,
  "flat-color-icons:display":              display,
  "flat-color-icons:command-line":         command_line,
  "flat-color-icons:document":             document,
  "flat-color-icons:download":             dl_download,
  "flat-color-icons:upload":               upload,
  "flat-color-icons:engineering":          engineering,
  "flat-color-icons:factory":              factory,
  "flat-color-icons:factory-breakdown":    factory_breakdown,
  "flat-color-icons:globe":                globe,
  "flat-color-icons:home":                 home,
  "flat-color-icons:idea":                 idea,
  "flat-color-icons:settings":             settings,
  "flat-color-icons:lock":                 lock_icon,
  "flat-color-icons:unlock":               unlock,
  "flat-color-icons:key":                  key,
  "flat-color-icons:link":                 link,
  "flat-color-icons:money-transfer":       money_transfer,
  "flat-color-icons:currency-exchange":    currency_exchange,
  "flat-color-icons:debt":                 debt,
  "flat-color-icons:paid":                 paid,
  "flat-color-icons:donate":               donate,
  "flat-color-icons:news":                 news,
  "flat-color-icons:rating":               rating,
  "flat-color-icons:like":                 like,
  "flat-color-icons:dislike":              dislike,
  "flat-color-icons:search":               search,
  "flat-color-icons:no-idea":              no_idea,
  "flat-color-icons:google":               google_icon,
  "flat-color-icons:linux":                linux,
  "flat-color-icons:wikipedia":            wikipedia,
  "flat-color-icons:wi-fi-logo":           wifi_logo,
  "flat-color-icons:checkmark":            checkmark,
  "flat-color-icons:ok":                   ok,
  "flat-color-icons:plus":                 plus,
  "flat-color-icons:minus":                minus,
  "flat-color-icons:next":                 next_icon,
  "flat-color-icons:previous":             previous_icon,
  "flat-color-icons:share":                share,
  "flat-color-icons:start":                start,
  "flat-color-icons:process":              process_icon,
  "flat-color-icons:sim-card-chip":        sim_card_chip,
  "flat-color-icons:flash-on":             flash_on,
  "flat-color-icons:electricity":          electricity,
  "flat-color-icons:electronics":          electronics,
  "flat-color-icons:integrated-webcam":    integrated_webcam,
  "flat-color-icons:gallery":              gallery,
  "flat-color-icons:picture":              picture,
  "flat-color-icons:video-file":           video_file,
  "flat-color-icons:image-file":           image_file,
  "flat-color-icons:audio-file":           audio_file,
  "flat-color-icons:film-reel":            film_reel,
  "flat-color-icons:music":                music,
  "flat-color-icons:expired":              expired,
  "flat-color-icons:safe":                 safe,
  "flat-color-icons:trademark":            trademark,
  "flat-color-icons:copyright":            copyright,
  "flat-color-icons:signature":            signature,
  "flat-color-icons:graduation-cap":       graduation_cap,
  "flat-color-icons:diploma-1":            diploma_1,
  "flat-color-icons:rules":                rules,
  "flat-color-icons:decision":             decision,
  "flat-color-icons:make-decision":        make_decision,
  "flat-color-icons:statistics":           statistics,
  "flat-color-icons:timeline":             timeline,
};
