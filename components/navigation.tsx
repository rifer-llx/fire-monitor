"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const linkClass =
  "inline-block transform cursor-pointer rounded-lg px-1 py-0.5 text-xs tracking-wider text-slate-700 no-underline duration-75 hover:bg-slate-100 dark:font-semibold dark:text-slate-300 dark:hover:bg-gray-950 dark:hover:text-white";

export default function Navigation() {
  const t = useTranslations("root");

  return (
    <motion.div className="flex flex-1 items-center justify-between px-[60px] md:hidden">
      <motion.div variants={{ hidden: { y: -10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
        <Link href="/" className={linkClass}>
          {t("tab1")}
        </Link>
      </motion.div>
      <motion.div variants={{ hidden: { y: -10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
        <Link href="/map" className={linkClass}>
          {t("tab2")}
        </Link>
      </motion.div>
      <motion.div variants={{ hidden: { y: -10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
        <Link href="https://github.com/rifer-llx/fire-monitor" className={linkClass}>
          {t("tab3")}
        </Link>
      </motion.div>
      <motion.div variants={{ hidden: { y: -10, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
        <Link href="/map" className={linkClass}>
          {t("signIn")}
        </Link>
      </motion.div>
    </motion.div>
  );
}
