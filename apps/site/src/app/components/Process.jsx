import { motion } from 'motion/react';
import { MessageSquare, Search, ShoppingBag, Truck } from 'lucide-react';
import { PROCESS_STEPS, localize } from '../data/siteData.js';
import { useSite } from '../context/SiteContext.jsx';

const iconMap = { Search, MessageSquare, ShoppingBag, Truck };

function scrollToId(id) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}



// export function Process({ openAuthModal }) {
// // const { language, text } = useSite();

//   const steps = [
//     {
//       icon: Search,
//       number: '01',
//       title: 'Выбор продукта',
//       description: 'Изучите наш каталог и выберите подходящую радарную систему. Наши специалисты помогут подобрать оптимальное решение для вашего автомобиля.',
//     },
//     {
//       icon: MessageSquare,
//       number: '02',
//       title: 'Консультация',
//       description: 'Получите детальную консультацию о возможностях системы, способах установки и совместимости с вашим автомобилем. Обсудим все технические детали.',
//     },
//     {
//       icon: ShoppingBag,
//       number: '03',
//       title: 'Оформление заказа',
//       description: 'Оформите заказ удобным способом: онлайн, по телефону или в офисе. Предложим выгодные условия оплаты и доставки оборудования.',
//     },
//     {
//       icon: Truck,
//       number: '04',
//       title: 'Доставка и установка',
//       description: 'Доставим оборудование в удобное время и место. Профессиональная установка, настройка и тестирование системы нашими сертифицированными инженерами.',
//     },
//   ];

//   return (
//     <section id="process" className="relative py-24 bg-black overflow-hidden">
//       {/* Background Grid */}
//       <div className="absolute inset-0 opacity-10">
//         <div className="absolute inset-0" style={{
//           backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
//           backgroundSize: '50px 50px'
//         }}></div>
//       </div>

//       {/* Glowing Orbs */}
//       <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
//       <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

//       <div className="container mx-auto px-4 relative z-10">
//         <motion.div
//           initial={{ opacity: 0, y: 30 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.8 }}
//           viewport={{ once: true }}
//           className="text-center mb-16"
//         >
//           <span className="inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
//             Процесс покупки
//           </span>
//           <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
//             Как это работает
//           </h2>
//           <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
//             Простой и прозрачный процесс от выбора до установки оборудования
//           </p>
//         </motion.div>

//         <div className="relative">
//           {/* Connection Line (Desktop) */}
//           <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5">
//             <div className="relative w-full h-full max-w-5xl mx-auto px-24">
//               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
//               <motion.div
//                 className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500"
//                 initial={{ scaleX: 0 }}
//                 whileInView={{ scaleX: 1 }}
//                 transition={{ duration: 1.5, delay: 0.5 }}
//                 viewport={{ once: true }}
//                 style={{ transformOrigin: 'left' }}
//               />
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
//             {steps.map((step, index) => (
//               <motion.div
//                 key={index}
//                 initial={{ opacity: 0, y: 50 }}
//                 whileInView={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.6, delay: index * 0.2 }}
//                 viewport={{ once: true }}
//                 className="relative"
//               >
//                 {/* Card */}
//                 <div className="relative group">
//                   <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
//                   <div className="relative bg-gray-900/50 backdrop-blur-sm border border-slate-200 dark:border-cyan-500/20 rounded-2xl p-8 group-hover:border-cyan-500/40 transition-all duration-500">
//                     {/* Number Badge */}
//                     <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-cyan-500/50 group-hover:scale-110 transition-transform duration-300">
//                       {step.number}
//                     </div>

//                     {/* Icon */}
//                     <div className="mb-6 relative inline-block">
//                       <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div>
//                       <div className="relative w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-500">
//                         <step.icon className="w-10 h-10 text-white" />
//                       </div>
//                     </div>

//                     {/* Content */}
//                     <h3 className="text-2xl font-bold text-white mb-4">
//                        {/* {localize(step.title, language)} */}
//                       {step.title}
//                     </h3>
//                     <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
//                       {step.description}
//                     </p>

//                     {/* Pulse Indicator */}
//                     <div className="absolute bottom-4 left-4 flex gap-1">
//                       {[...Array(3)].map((_, i) => (
//                         <motion.div
//                           key={i}
//                           className="w-1 h-1 bg-cyan-400 rounded-full"
//                           animate={{
//                             scale: [1, 1.5, 1],
//                             opacity: [0.3, 1, 0.3],
//                           }}
//                           transition={{
//                             duration: 1.5,
//                             repeat: Infinity,
//                             delay: i * 0.2,
//                           }}
//                         />
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//         </div>

//         {/* CTA */}
//         <motion.div
//           initial={{ opacity: 0, y: 30 }}
//           whileInView={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.8 }}
//           viewport={{ once: true }}
//           className="text-center mt-16"
//         >
//           <p className="text-slate-600 dark:text-slate-400 mb-6">Готовы начать?</p>
//           <button
//               onClick={() => (onCatalog ? onCatalog() : scrollToId('catalog'))}                
//             className="inline-block px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-medium text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
//           >
//             Выбрать оборудование
//           </button>
//         </motion.div>
//       </div>
//     </section>
//   );
// }





export function Process({ onCatalog }) {
  const { language, text } = useSite();

  return (
    <section id="process" className="relative overflow-hidden bg-slate-50 py-24 transition-colors dark:bg-black">
      <div className="absolute inset-0 opacity-50 dark:opacity-100">
        <div className="absolute left-1/4 top-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-slate-200 dark:border-cyan-500/20 bg-white px-4 py-2 text-sm font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
            {text.process.tag}
          </span>
          <h2 className="mt-6 text-4xl font-bold text-slate-900 dark:text-white md:text-5xl">{text.process.title}</h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">{text.process.description}</p>
        </motion.div>
        


        <div className=" grid grid-cols-1  md:grid-cols-2 lg:grid-cols-4 gap-8 ">

          {PROCESS_STEPS.map((step, index) => {
            const Icon = iconMap[step.icon];

            return (
              
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                className=" relative group bg-gray-900/50 backdrop-blur-sm border  border-slate-200 dark:border-cyan-500/20 rounded-3xl  p-8 group-hover:border-cyan-500/40 transition-all duration-500"
                // className="olan-card relative rounded-3xl border border-slate-200 dark:border-cyan-500/15 bg-white p-8 shadow-lg shadow-slate-900/5 dark:bg-slate-950/65"
              >
                
                <div className=" absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-cyan-500/50 group-hover:scale-110 transition-transform duration-500">
                  {step.number}
                </div>
                  <div className="mb-6 inline-flex h-19 w-19">
                      {/* <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div> */}
                      <div className="relative w-19 h-19 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-500">
                        <Icon className="h-10 w-10 text-white " />
                      </div>
                    
                  </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{localize(step.title, language)}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{localize(step.description, language)}</p>
                 <div className="absolute bottom-4 left-4 flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 h-1 bg-cyan-400 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <button
            type="button"
            onClick={() => (onCatalog ? onCatalog() : scrollToId('catalog'))}
            className="inline-block px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-medium text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
          >
            {text.actions.chooseEquipment}
          </button>
        </div>
      </div>
    </section>
  );
}
