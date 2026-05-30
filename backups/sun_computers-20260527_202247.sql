-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: cloud.anyrdp.in    Database: sun_computers
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_code` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_code` (`client_code`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'CLT001','Robert Wilson','robert.wilson@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Regular customer, prefers email communication','2025-12-28 12:00:59','2026-04-09 16:27:39'),(2,'CLT002','Jennifer Lee','jennifer.lee@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Business customer, multiple devices','2025-12-28 12:00:59','2025-12-30 05:00:57'),(3,'CLT003','David Chen','david.chen@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Student, budget conscious','2025-12-28 12:00:59','2025-12-30 05:00:55'),(4,'CLT004','Emily Garcia','emily.garcia@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Prefers phone calls, quick service','2025-12-28 12:00:59','2025-12-30 05:00:53'),(5,'CLT005','Michael Brown','michael.brown@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Small business owner','2025-12-28 12:00:59','2026-01-10 18:23:08'),(6,'CLT006','Amanda Taylor','amanda.taylor@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Frequent service customer','2025-12-28 12:00:59','2025-12-30 05:00:47'),(7,'CLT007','James Miller','james.miller@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Corporate client','2025-12-28 12:00:59','2026-04-07 19:05:10'),(8,'CLT008','Jessica Martinez','jessica.martinez@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Tech enthusiast','2025-12-28 12:00:59','2025-12-30 05:00:43'),(9,'CLT009','William Anderson','william.anderson@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Senior citizen, needs clear explanations','2025-12-28 12:00:59','2025-12-30 05:00:40'),(10,'CLT010','Olivia Thomas','olivia.thomas@email.com','123456789','123 Main Street','Tirunelveli','Tamil Nadu','627201','Remote worker, urgent repairs needed','2025-12-28 12:00:59','2025-12-30 05:00:38'),(21,'CLT20251228478','jj','jj@gmaill.com','8220647708','123 Main Street','Tirunelveli','Tamil Nadu','627201','Created from order','2025-12-28 16:53:07','2026-01-11 15:06:35'),(22,'CLT20251228404','athi','jeevan2k3linux@gmail.com','9629212739','137/4 MAIN ROAD MANUR','Tirunelveli','Tamil Nadu','627201','costomer','2025-12-28 17:24:08','2026-01-15 19:24:25'),(23,'CLT20260106943','anto','','1234567898','','','','','Created from order','2026-01-06 14:49:36','2026-01-11 15:06:17'),(24,'CLT20260107543','jj','jeevan2k3linux@gmail.com','1234567891','137/4 MAIN ROAD MANUR','Tirunelveli','Tamil Nadu','627201','xxxyyyzzz','2026-01-07 13:39:34','2026-01-07 13:39:34'),(25,'CLT2026010890CF02','sdcafeewef','jeevan2k3linux@gmail.com','5255415421','137/4 MAIN ROAD MANUR','Tirunelveli','Tamil Nadu','627201','ewefwefew2fef','2026-01-08 17:11:37','2026-01-08 17:11:37'),(26,'CLT20260110351','][;lkj','','\';lkjh','','','','','Created from order','2026-01-10 07:20:07','2026-01-10 07:20:07'),(27,'CLT20260110243',';.,mnbvgcrvbnm','','lkojihugytdrtfgyhuji','','','','','Created from order','2026-01-10 07:22:51','2026-01-10 07:22:51'),(28,'CLT20260110299',';.,mnbvgcrvbnm','','lkojihugytdrtfgyhuji','','','','','Created from order','2026-01-10 07:22:52','2026-01-10 07:22:52'),(29,'CLT20260110873',';.,mnbvgcrvbnm','','lkojihugytdrtfgyhuji','','','','','Created from order','2026-01-10 07:22:52','2026-01-10 07:22:52'),(30,'CLT20260110123',';.,mnbvgcrvbnm','','lkojihugytdrtfgyhuji','','','','','Created from order','2026-01-10 07:22:52','2026-01-10 07:22:52'),(31,'CLT20260110256','dedsfdd','atbi@gmail.com','1144778899','137/4 MAIN ROAD MANUR','Tirunelveli','Tamil Nadu','627201','satgf d','2026-01-10 15:16:42','2026-01-10 15:16:42'),(32,'CLT202601107B5281','Santiya','','5544668822','','','','','Created from order','2026-01-10 16:14:15','2026-01-10 16:14:15'),(33,'CLT202601108EBD14','Santiya','jeevan@gmail.com','5544668822','santiya12@gmail.com','Tirunelveli','Tamil Nadu','627201','Created from order','2026-01-10 16:14:16','2026-05-24 15:50:30'),(34,'CLT20260110C920B2','KAVI','kavi@gmail.com','08220647708','137/4 MAIN ROAD MANUR','Tirunelveli','Tamil Nadu','627201','asffsaa','2026-01-10 16:14:36','2026-04-07 19:08:19'),(37,'CLT20260110CDB0F8','appi','jeevan2k3linux@gmail.com','5588226644','137/4 MAIN ROAD MANUR','TIRUNELVLEI','TAMIL NADU','627201','Created from orderffdfd','2026-01-10 17:14:52','2026-01-10 17:29:01'),(40,'CLT2026011151D18D','siva',NULL,'3355779911',NULL,NULL,NULL,NULL,NULL,'2026-01-11 12:46:29','2026-01-11 15:04:31'),(41,'CLT20260111060060','Diviya',NULL,'1155993377',NULL,NULL,NULL,NULL,NULL,'2026-01-11 17:33:04','2026-04-09 15:41:25'),(42,'CLT2026011160CE2C','agaa',NULL,'65651165165',NULL,NULL,NULL,NULL,NULL,'2026-01-11 19:37:58','2026-04-05 17:08:06'),(43,'CLT20260111B52683','asf',NULL,'87788',NULL,NULL,NULL,NULL,NULL,'2026-01-11 19:51:39','2026-01-11 19:51:39'),(44,'CLT20260112D2633A','yyyy','','51561984984','',NULL,NULL,NULL,NULL,'2026-01-12 15:22:05','2026-04-07 16:08:56'),(45,'CLT20260115964','Sandy ','sandy12@gmail.com','4268761383','137/4 Velachery ,baby Nager , venayaga street venayaga Mens PG','Chennai ','Tamilnadu ','600201','This client is best and regular client ','2026-01-15 19:15:40','2026-04-09 17:22:57'),(46,'CLT20260403228','athidgdsgsg','jeevan2k3linux@gmail.com','08220647708','137/4 MAIN ROAD MANUR','Tirunelveli','Tamil Nadu','627201','dvgvsd','2026-04-03 18:04:46','2026-04-12 14:14:50');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `deliveries`
--

DROP TABLE IF EXISTS `deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deliveries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `delivery_code` varchar(20) NOT NULL,
  `delivery_type` enum('pickup','delivery') DEFAULT 'pickup',
  `address` text DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `delivered_date` timestamp NULL DEFAULT NULL,
  `delivery_person` varchar(100) DEFAULT NULL,
  `status` enum('scheduled','in_transit','delivered','cancelled','failed') DEFAULT 'scheduled',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_code` (`delivery_code`),
  KEY `idx_deliveries_order_id` (`order_id`),
  KEY `idx_deliveries_status_date` (`status`,`scheduled_date`),
  CONSTRAINT `deliveries_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deliveries`
--

LOCK TABLES `deliveries` WRITE;
/*!40000 ALTER TABLE `deliveries` DISABLE KEYS */;
INSERT INTO `deliveries` VALUES (1,11,'DEL001','pickup','123 Main Street, New York, NY 10001','Robert Wilson','123456789','2024-02-14','14:30:00','2024-02-13 18:30:00','John Delivery','delivered','Customer was home, signed for delivery. Package in good condition.','2025-12-28 14:46:24','2026-01-04 15:42:30'),(2,12,'DEL002','pickup','456 Oak Avenue, Los Angeles, CA 90001','Jennifer Lee','123456789','2024-02-17','11:00:00','2024-02-16 18:30:00','Store Staff','delivered','Customer picked up at store counter.','2025-12-28 14:46:24','2026-01-04 15:42:30'),(3,14,'DEL000014','delivery','Address not specified','Emily Garcia','123456789','2024-02-22','09:00:00','2025-12-28 19:06:03','Auto-assigned','delivered','Product: Samsung Galaxy S24. Order marked as delivered automatically.','2025-12-28 19:06:03','2025-12-30 05:02:11'),(4,15,'DEL000015','delivery','Address not specified','Michael Brown','123456789','2024-02-25','09:00:00','2025-12-28 19:07:43','Auto-assigned','delivered','Product: Gaming Desktop Pro. Order marked as delivered automatically.','2025-12-28 19:07:43','2025-12-30 05:02:16'),(5,11,'DEL000011','delivery','Address not specified','Robert Wilson','123456789','2024-02-15','09:00:00','2025-12-30 05:03:33','Auto-assigned','delivered','Product: MacBook Pro 16-inch. Order marked as delivered automatically.','2025-12-30 05:03:33','2025-12-30 05:03:33'),(6,12,'DEL000012','delivery','Address not specified','Jennifer Lee','123456789','2024-02-18','09:00:00','2025-12-30 05:03:45','Auto-assigned','delivered','Product: iPhone 15 Pro. Order marked as delivered automatically.','2025-12-30 05:03:45','2025-12-30 05:03:45'),(20,27,'DEL000027','delivery','Address not specified','anto','1234567898','2026-01-08','09:00:00','2026-01-10 18:23:00','Auto-assigned','delivered','Product: Unknown. Order marked as delivered automatically.','2026-01-10 18:23:00','2026-01-10 18:23:00'),(21,26,'DEL000026','delivery','Address not specified','Michael Brown','123456789','2026-01-08','09:00:00','2026-01-10 18:23:08','Auto-assigned','delivered','Product: iPhone 15 Pro. Order marked as delivered automatically.','2026-01-10 18:23:08','2026-01-10 18:23:08'),(22,30,'DEL000030','delivery','Address not specified','siva','3355779911','2026-01-11','09:00:00','2026-01-11 15:04:31','Auto-assigned','delivered','Product: vivo. Order marked as delivered automatically.','2026-01-11 15:04:31','2026-01-11 15:04:31'),(23,48,'DEL000048','pickup',NULL,'agaa','65651165165',NULL,'09:00:00','2026-04-03 19:47:12','System Auto-assigned','delivered','Auto-created delivery record for order ORD20260403D0CD24 - Product delivered','2026-04-03 19:47:12','2026-04-03 19:47:12'),(25,50,'DEL000050','pickup',NULL,'agaa','65651165165',NULL,'09:00:00','2026-04-05 17:08:06','System Auto-assigned','delivered','Auto-created delivery record for order ORD20260403EBA1E5 - Product delivered','2026-04-05 17:08:06','2026-04-05 17:08:06'),(26,52,'DEL000052','pickup','137/4 MAIN ROAD MANUR','athidgdsgsg','08220647708',NULL,'09:00:00','2026-04-07 13:18:15','System Auto-assigned','delivered','Auto-created delivery record for order ORD20260407F5775E - Product delivered','2026-04-07 13:18:15','2026-04-07 13:18:15');
/*!40000 ALTER TABLE `deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `images`
--

DROP TABLE IF EXISTS `images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_images_user` (`user_id`),
  CONSTRAINT `fk_images_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `images`
--

LOCK TABLES `images` WRITE;
/*!40000 ALTER TABLE `images` DISABLE KEYS */;
/*!40000 ALTER TABLE `images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `income_entries`
--

DROP TABLE IF EXISTS `income_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `income_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_type` varchar(50) NOT NULL DEFAULT 'general',
  `income_source` varchar(100) NOT NULL DEFAULT 'manual',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `income_date` date NOT NULL,
  `description` varchar(255) NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `reference_number` varchar(100) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `order_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_income_entries_service_date` (`service_type`,`income_date`),
  KEY `idx_income_entries_client_date` (`client_id`,`income_date`),
  KEY `idx_income_entries_order_date` (`order_id`,`income_date`),
  KEY `fk_income_entries_created_by` (`created_by`),
  CONSTRAINT `fk_income_entries_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_income_entries_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_income_entries_order` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `income_entries`
--

LOCK TABLES `income_entries` WRITE;
/*!40000 ALTER TABLE `income_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `income_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` enum('order','payment','system','alert') DEFAULT 'system',
  `is_read` tinyint(1) DEFAULT 0,
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`),
  KEY `idx_notifications_is_read` (`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'Welcome to Sun Computers','System is ready for use','',0,NULL,'2025-12-28 11:55:47'),(2,4,'Welcome to Sun Computers','System is ready for use','',0,NULL,'2025-12-28 11:55:47');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_parts`
--

DROP TABLE IF EXISTS `order_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `part_name` varchar(200) NOT NULL,
  `part_code` varchar(50) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `total_price` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_parts_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_parts`
--

LOCK TABLES `order_parts` WRITE;
/*!40000 ALTER TABLE `order_parts` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_parts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_status_history`
--

DROP TABLE IF EXISTS `order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order_status_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `status` varchar(50) NOT NULL,
  `notes` text DEFAULT NULL,
  `changed_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `order_status_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_status_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_status_history`
--

LOCK TABLES `order_status_history` WRITE;
/*!40000 ALTER TABLE `order_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payment_code` varchar(50) NOT NULL,
  `order_id` int(11) NOT NULL,
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `final_cost` decimal(10,2) DEFAULT NULL,
  `deposit_amount` decimal(10,2) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','card','bank_transfer','upi','cheque') DEFAULT 'cash',
  `transaction_id` varchar(100) DEFAULT NULL,
  `payment_status` enum('paid','completed','failed','refunded') DEFAULT 'completed',
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_code` (`payment_code`),
  KEY `order_id` (`order_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,'PAY001',11,0.00,0.00,0.00,0.00,'cash','CASH_001','paid','Free warranty repair',1,'2024-02-14 05:00:00','2026-01-11 16:58:04'),(2,'PAY002',12,89.99,89.99,89.99,114.99,'card','CARD_20240216_12345','paid','Battery replacement - out of warranty',5,'2024-02-16 08:50:00','2026-01-11 16:58:04'),(3,'PAY003',13,0.00,0.00,0.00,0.00,'cash','CASH_002','completed','Keyboard replacement under warranty',5,'2024-02-20 05:45:00','2026-01-11 16:58:04'),(4,'PAY004',14,150.00,50.00,50.00,349.97,'upi','UPI_9876543210','completed','Deposit for camera repair',8,'2024-02-21 11:15:00','2026-01-11 16:58:04'),(5,'PAY005',14,99.99,99.99,99.99,349.97,'bank_transfer','BANK_XFR_ABC123','paid','Balance payment for camera repair',8,'2024-02-22 04:00:00','2026-01-11 16:58:04'),(6,'PAY006',15,0.00,0.00,0.00,0.00,'cash','CASH_003','completed','Thermal paste replacement under warranty',7,'2024-02-24 07:50:00','2026-01-11 16:58:04'),(8,'PAY008',17,129.99,129.99,129.99,129.99,'card','CARD_20240228_67890','completed','Full payment for PSU replacement',8,'2024-02-28 05:15:00','2026-01-11 16:58:04'),(10,'PAY010',19,0.00,0.00,0.00,0.00,'cash','CASH_005','completed','Bluetooth module under warranty',5,'2024-02-26 09:20:00','2026-01-11 16:58:04'),(14,'PAY014',12,75.00,25.00,25.00,114.99,'upi','UPI_DEPOSIT_001','completed','Initial deposit for battery replacement',7,'2024-02-15 06:00:00','2026-01-11 16:58:04'),(15,'PAY015',14,49.99,49.99,49.99,349.97,'cheque','CHQ_789456','paid','Cheque payment - waiting for clearance',8,'2024-02-23 04:30:00','2026-01-11 16:58:04'),(16,'PAY-ORD004-1767084057',14,149.99,149.99,149.99,349.97,'cash',NULL,'completed',NULL,8,'2025-12-30 08:40:57','2026-01-11 16:58:04'),(18,'PAY-ORD20260108214-1768143977',25,500.00,500.00,500.00,500.00,'cash',NULL,'completed',NULL,5,'2026-01-11 15:06:17','2026-01-11 16:58:04'),(19,'PAY-ORD2026011151E14B-1768144443',30,1000.00,1000.00,1000.00,1000.00,'cash',NULL,'completed',NULL,20,'2026-01-11 15:14:03','2026-01-11 16:58:04'),(20,'PAY-ORD20260111130-DEPOSIT',31,600.00,200.00,200.00,400.00,'cash',NULL,'completed','Initial deposit for service order',21,'2026-01-11 16:53:53','2026-01-11 16:58:04'),(25,'PAY-ORD202601116B6EC3-DEPOSIT',33,NULL,NULL,NULL,2000.00,'cash',NULL,'completed','Initial deposit for service order',24,'2026-01-11 17:19:02','2026-01-11 17:19:02'),(26,'PAY-ORD202601116B6EC3-DEPOSIT-1768151942',33,NULL,NULL,NULL,2000.00,'cash',NULL,'completed','Initial deposit for service order',24,'2026-01-11 17:19:02','2026-01-11 17:19:02'),(27,'PAY-ORD202601116B6EC3-1768151942',33,NULL,NULL,NULL,4000.00,'cash',NULL,'completed',NULL,24,'2026-01-11 17:19:02','2026-01-11 17:19:02'),(28,'PAY-ORD20260111D8C81B-DEPOSIT-1768152317',34,NULL,NULL,NULL,2500.00,'cash',NULL,'completed','Initial deposit for service order',19,'2026-01-11 17:25:17','2026-01-11 17:25:17'),(29,'PAY-ORD20260111D8C81B-FINAL-UPDATE-1768152469',34,NULL,NULL,NULL,3500.00,'cash',NULL,'completed','Final payment after order update',19,'2026-01-11 17:27:49','2026-01-11 17:27:49'),(30,'PAY-ORD20260111F22E14-DEPOSIT-1768153359',36,NULL,NULL,NULL,1999.99,'cash',NULL,'completed','Initial deposit for service order',19,'2026-01-11 17:42:39','2026-01-11 17:42:39'),(31,'PAY-ORD20260111F22E14-PARTIAL-1768153359',36,NULL,NULL,NULL,1999.99,'cash',NULL,'completed','Partial payment for service order',19,'2026-01-11 17:42:39','2026-01-11 17:42:39'),(32,'PAY-ORD20260111F22E14-FINAL-UPDATE-1768153487',36,NULL,NULL,NULL,1000.00,'cash',NULL,'completed','Final payment after order update',19,'2026-01-11 17:44:47','2026-01-11 17:44:47'),(33,'PAY-ORD20260111477814-DEPOSIT-1768153588',37,NULL,NULL,NULL,2000.00,'cash',NULL,'completed','Initial deposit for service order',23,'2026-01-11 17:46:28','2026-01-11 17:46:28'),(34,'PAY-ORD20260111477814-FINAL-UPDATE-1768153675',37,NULL,NULL,NULL,4000.00,'cash',NULL,'completed','Final payment after order update',23,'2026-01-11 17:47:55','2026-01-11 17:47:55'),(35,'PAY-ORD20260112D26CE9-1768231387',40,1000.00,799.99,300.00,300.00,'cash',NULL,'paid','Deposit payment for order ORD20260112D26CE9',1,'2026-01-12 15:23:07','2026-01-12 15:23:07'),(36,'PAY-ORD2026011538086D-DEPOSIT-1768488067',41,NULL,NULL,NULL,2000.00,'cash',NULL,'completed','Initial deposit for service order',21,'2026-01-15 14:41:07','2026-01-15 14:41:07'),(37,'PAY-ORD20260115AF3D54-1768498189',42,8000.00,5000.00,3000.00,3000.00,'cash',NULL,'paid','Deposit payment for order ORD20260115AF3D54',1,'2026-01-15 17:29:49','2026-01-15 17:29:49'),(38,'PAY-ORD20260115DA2F60-DEPOSIT-1768504701',43,NULL,NULL,NULL,1500.00,'cash',NULL,'completed','Initial deposit for service order',19,'2026-01-15 19:18:21','2026-01-15 19:18:21'),(39,'PAY-ORD202601163077DD-1768544371',44,500.00,500.00,200.00,200.00,'cash',NULL,'paid','Initial payment for order ORD202601163077DD',1,'2026-01-16 06:19:31','2026-01-16 06:19:31');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_code` varchar(20) NOT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `is_spare_product` tinyint(1) NOT NULL DEFAULT 0,
  `product_name` varchar(200) NOT NULL,
  `brand` varchar(50) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `category` enum('laptop','desktop','mobile','tablet','accessory','other') DEFAULT 'other',
  `claim_type` enum('none','shop_claim','company_claim','sun_to_company','company_to_sun') NOT NULL DEFAULT 'none',
  `specifications` text DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_period` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `status` enum('active','inactive','discontinued','out_of_stock') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_code` (`product_code`),
  UNIQUE KEY `ux_products_serial_number` (`serial_number`),
  KEY `idx_products_status` (`status`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_claim_type` (`claim_type`)
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'PRD001','SN-PRD001-1',0,'MacBook Pro 16-inch','Apple','M3 Pro','laptop','shop_claim','M3 Pro chip, 18GB RAM, 512GB SSD, Liquid Retina XDR display','2023-11-15','1 year',2499.99,'active','2025-12-28 12:00:59','2026-04-05 17:07:51'),(2,'PRD002','SN-PRD002-2',0,'Dell XPS 13','Dell','XPS 13 9320','laptop','shop_claim','Intel Core i7, 16GB RAM, 1TB SSD, 13.4\" 4K display','2023-10-20','2 years',1599.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(3,'PRD003','SN-PRD003-3',0,'iPhone 15 Pro','Apple','iPhone 15 Pro','mobile','shop_claim','A17 Pro chip, 256GB, Titanium design, 48MP camera','2023-09-22','1 year',1099.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(4,'PRD004','SN-PRD004-4',0,'Samsung Galaxy S24','Samsung','S24 Ultra','mobile','shop_claim','Snapdragon 8 Gen 3, 512GB, S Pen, 200MP camera','2024-01-30','2 years',1299.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(5,'PRD005','SN-PRD005-5',0,'iPad Pro 12.9','Apple','M2 iPad Pro','tablet','shop_claim','M2 chip, 1TB, Liquid Retina XDR, 5G capable','2023-05-10','1 year',1499.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(6,'PRD006','SN-PRD006-6',0,'Unknown','','VIvo y200e','laptop','shop_claim','','2023-08-15','1 year',0.00,'discontinued','2025-12-28 12:00:59','2026-03-25 14:54:10'),(7,'PRD007','SN-PRD007-7',0,'Gaming Desktop Pro','Custom Build','AMD Ryzen 9','desktop','shop_claim','AMD Ryzen 9 7900X, RTX 4080, 32GB RAM, 2TB NVMe SSD','2023-12-01','3 years',2899.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(8,'PRD008','SN-PRD008-8',0,'HP Envy Desktop','HP','Envy TE02','desktop','shop_claim','Intel Core i7, 16GB RAM, 1TB SSD, NVIDIA RTX 3060','2023-07-25','2 years',1299.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(9,'PRD009','SN-PRD009-9',0,'USB-C Hub','Anker','7-in-1 Hub','accessory','shop_claim','HDMI, USB 3.0, USB-C PD, SD/TF card readers','2024-01-10','18 months',49.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(10,'PRD010','SN-PRD010-10',0,'Wireless Mouse','Logitech','MX Master 3S','accessory','shop_claim','Ergonomic design, 8K DPI, multi-device switching','2023-11-30','2 years',99.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(11,'PRD011','SN-PRD011-11',0,'Laptop Charger','Dell','65W USB-C','accessory','shop_claim','65W USB-C Charger for Dell Laptops','2024-02-01','1 year',59.99,'active','2025-12-28 12:00:59','2026-03-25 14:54:10'),(25,'PRD20251228577','SN-PRD20251228577-25',0,'afasasas','aassafafa','dddffsda','laptop','shop_claim','','2025-12-28','1 year',0.00,'discontinued','2025-12-28 16:53:07','2026-03-25 14:54:10'),(26,'PRD20251228623','SN-PRD20251228623-26',0,'mobile phone','Vivo','VIvo y200e','mobile','shop_claim','super','2025-12-28','1',1000.00,'active','2025-12-28 17:25:39','2026-03-25 14:54:10'),(28,'PRD20260110876','SN-PRD20260110876-28',0,'fedds','ddfdf','dffsd','tablet','shop_claim','uinoinasofa','2026-01-10','1 year',5000.00,'active','2026-01-10 15:16:11','2026-03-25 14:54:10'),(29,'PRD2026011050D64A','SN-PRD2026011050D64A-29',0,'dsdsdds','Vivo','VIvo y200e','other','shop_claim','',NULL,'',0.00,'discontinued','2026-01-10 18:21:41','2026-04-10 17:49:56'),(30,'PRD2026011151DED8','SN-PRD2026011151DED8-30',0,'vivo',NULL,NULL,'other','shop_claim',NULL,NULL,NULL,0.00,'active','2026-01-11 12:46:29','2026-03-25 14:54:10'),(31,'PRD20260111913','SN-PRD20260111913-31',0,'Surface Pro 9','','','laptop','shop_claim','','2026-01-11','1 year',6000.00,'active','2026-01-11 17:46:28','2026-03-25 14:54:10'),(32,'PRD2026011160D795','SN-PRD2026011160D795-32',0,'agaaagaa',NULL,NULL,'other','shop_claim',NULL,NULL,NULL,0.00,'active','2026-01-11 19:37:58','2026-03-25 14:54:10'),(33,'PRD20260111B5332F','SN-PRD20260111B5332F-33',0,'sfafsafa',NULL,NULL,'other','shop_claim',NULL,NULL,NULL,0.00,'active','2026-01-11 19:51:39','2026-03-25 14:54:10'),(34,'PRD20260112D26C55','SN-PRD20260112D26C55-34',0,'ffagegewewgewg',NULL,NULL,'other','shop_claim',NULL,NULL,NULL,0.00,'active','2026-01-12 15:22:05','2026-04-09 16:27:39'),(35,'PRD20260115AF332C','SN-PRD20260115AF332C-35',0,'dssd',NULL,NULL,'other','shop_claim',NULL,NULL,NULL,0.00,'active','2026-01-15 17:29:30','2026-03-25 14:54:10'),(36,'PRD20260115350','SN-PRD20260115350-36',0,'Asus gaming pc build','','','laptop','shop_claim','','2026-01-15','1 year',6000.00,'active','2026-01-15 19:18:21','2026-03-25 14:54:10'),(37,'PRD20260116306E49','SN-PRD20260116306E49-37',0,'Gugn',NULL,NULL,'other','shop_claim',NULL,NULL,NULL,0.00,'active','2026-01-16 06:19:31','2026-04-09 15:37:12'),(38,'PRD20260227B69C16','SN-PRD20260227B69C16-38',0,'hererhheh',NULL,NULL,'other','shop_claim',NULL,NULL,NULL,0.00,'active','2026-02-27 18:47:07','2026-03-25 14:54:10'),(39,'PRD20260403364','fdg1471414514694941',0,'Samsung Galaxy S24','Amaron','VIvo y200e','laptop','none',NULL,NULL,NULL,0.00,'active','2026-04-03 18:06:07','2026-04-03 18:06:07'),(40,'PRD20260403225','5678678',0,'Samsung Galaxy S24','dfdf','87','laptop','shop_claim',NULL,NULL,NULL,0.00,'active','2026-04-03 18:06:20','2026-04-09 15:41:25'),(41,'PRD20260403472','86876876876876786',1,'iPhone 15 Pro','dsdssd','VIvo y200e8786876','laptop','company_claim','',NULL,NULL,0.00,'active','2026-04-03 18:06:38','2026-04-09 15:39:09'),(42,'PRD20260403606','86876876338758737836',0,'iPhone 15 Pro','Luminous','876378367','laptop','sun_to_company',NULL,NULL,NULL,0.00,'active','2026-04-03 18:06:50','2026-04-03 18:06:50'),(43,'PRD20260403350','56767867867867',0,'MacBook Pro 16-inch','dsdssd','VIvo y200e86786763','tablet','company_to_sun',NULL,NULL,NULL,0.00,'active','2026-04-03 18:07:09','2026-04-05 17:08:06'),(44,'PRD20260403207','78678678686',1,'Samsung Galaxy S24','Amaron',NULL,'laptop','none',NULL,NULL,NULL,0.00,'active','2026-04-03 18:33:00','2026-04-03 18:33:52'),(45,'PRD20260407252','985484',0,'y6y6y6yj',NULL,NULL,'laptop','none',NULL,NULL,NULL,0.00,'active','2026-04-07 12:29:35','2026-04-07 13:18:15'),(46,'PRD20260407079','5559',1,'Samsung Galaxy S24','','','laptop','none','',NULL,NULL,0.00,'active','2026-04-07 12:33:52','2026-04-09 15:38:36'),(47,'PRD20260409F4D46B',NULL,0,'safasassagasgsag','','','laptop','none','','2026-04-09','1 year',0.00,'active','2026-04-09 17:56:15','2026-04-09 17:56:15'),(48,'PRD202604093D6A9E',NULL,0,'Samsung Galaxy S24','','','laptop','none','','2026-04-09','1 year',0.00,'active','2026-04-09 18:18:11','2026-04-09 18:18:11'),(49,'PRD20260410A4244E',NULL,0,'etewtewt','','','laptop','none','','2026-04-10','1 year',0.00,'active','2026-04-10 18:39:54','2026-04-10 18:39:54'),(50,'PRD20260410A42AE4',NULL,0,'etewtewt','','','laptop','none','','2026-04-10','1 year',0.00,'active','2026-04-10 18:39:54','2026-04-10 18:39:54'),(51,'PRD20260410A42DD7',NULL,0,'ewqtqqttqqq','','','laptop','none','','2026-04-10','1 year',0.00,'active','2026-04-10 18:39:54','2026-04-10 18:39:54'),(52,'PRD20260410A4311B',NULL,0,'ewqtqqttqqq','','','laptop','none','','2026-04-10','1 year',0.00,'active','2026-04-10 18:39:54','2026-04-10 18:39:54'),(53,'PRD20260410A434CA',NULL,0,'ewqtqqttqqq','','','laptop','none','','2026-04-10','1 year',0.00,'active','2026-04-10 18:39:54','2026-04-10 18:39:54'),(54,'PRD20260410A43840',NULL,0,'ewqtqqttqqq','','','laptop','none','','2026-04-10','1 year',0.00,'active','2026-04-10 18:39:54','2026-04-10 18:39:54'),(55,'PRD202604125DB5EA',NULL,0,'fwqfqq','','','laptop','none','','2026-04-12','1 year',0.00,'active','2026-04-12 14:14:13','2026-04-12 14:14:13'),(56,'PRD202604125DBC95',NULL,0,'gewegewgwe','','','laptop','none','','2026-04-12','1 year',0.00,'active','2026-04-12 14:14:13','2026-04-12 14:14:13'),(57,'PRD2026042958C85F','sffsafafa',0,'jgfdfj',NULL,NULL,'other','none','rh rewhewh','2026-04-29','1 year',0.00,'active','2026-04-29 18:46:32','2026-04-29 18:46:32'),(58,'PRD20260429282433','sasaasgfva',0,'safsafasfa',NULL,NULL,'other','none','rh rewhewh','2026-04-29','1 year',0.00,'active','2026-04-29 18:46:32','2026-04-29 18:46:32'),(59,'PRD20260430A266F8','weqfq',0,'VIVO',NULL,NULL,'laptop','none','ewegwg','2026-04-30','1 year',0.00,'active','2026-04-30 14:55:08','2026-04-30 14:55:08'),(60,'PRD202604300C29E2','ewqfqfqff',0,'VIVO',NULL,NULL,'laptop','none','ewegwg','2026-04-30','1 year',0.00,'active','2026-04-30 14:55:08','2026-04-30 14:55:08'),(61,'PRD202604307BC66D','wefwqfwfwwff',0,'VIVO',NULL,NULL,'laptop','none','ewegwg','2026-04-30','1 year',0.00,'active','2026-04-30 14:55:08','2026-04-30 14:55:08'),(62,'PRD202604303FE52A','wffffwfqqf',0,'VIVO',NULL,NULL,'laptop','none','ewegwg','2026-04-30','1 year',0.00,'active','2026-04-30 14:55:08','2026-04-30 14:55:08'),(63,'PRD202604309222CD','ewgewg',0,'feweww',NULL,NULL,'laptop','none','ewegwg','2026-04-30','1 year',0.00,'active','2026-04-30 14:55:08','2026-04-30 14:55:08'),(64,'PRD202604304CD61D','ewgwgew',0,'egwe',NULL,NULL,'laptop','none','ewegwg','2026-04-30','1 year',0.00,'active','2026-04-30 14:55:08','2026-04-30 14:55:08'),(65,'PRD20260430EAF3F1','dfegfg',0,'etewtewt',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(66,'PRD20260430E4422D','grhggw',0,'etewtewt',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(67,'PRD2026043074FE2F','wegewgg',0,'etewtewt',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(68,'PRD20260430BC4A91','ewgg',0,'etewtewt',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(69,'PRD20260430674BF6','grhrhg',0,'ewgwegwgww',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(70,'PRD2026043087E12C','rrehrhgrew',0,'ewgwegwgww',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(71,'PRD20260430B95DEE','wewew',0,'ewgwegwgww',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(72,'PRD20260430168B9D','hr45rhger',0,'ewgwegwgww',NULL,NULL,'laptop','none','rerewrhg','2026-04-30','1 year',0.00,'active','2026-04-30 15:04:02','2026-04-30 15:04:02'),(73,'PRD20260430E80B99','egwgewg',0,'egewg',NULL,NULL,'laptop','none',NULL,'2026-04-30','1 year',0.00,'active','2026-04-30 15:06:46','2026-04-30 15:06:46'),(74,'PRD2026052469815B',NULL,0,'yhth4h',NULL,NULL,'other','none',NULL,NULL,NULL,0.00,'active','2026-05-24 15:50:30','2026-05-24 15:50:30');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=``*/ /*!50003 TRIGGER trg_products_bi_normalize_serial
BEFORE INSERT ON products
FOR EACH ROW
BEGIN
  IF NEW.serial_number IS NOT NULL THEN
    SET NEW.serial_number = REPLACE(
                              REPLACE(
                                REPLACE(
                                  REPLACE(TRIM(NEW.serial_number), ' ', ''),
                                CHAR(9), ''),
                              CHAR(10), ''),
                            CHAR(13), '');
    IF NEW.serial_number = '' THEN
      SET NEW.serial_number = NULL;
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=``*/ /*!50003 TRIGGER trg_products_bu_normalize_serial
BEFORE UPDATE ON products
FOR EACH ROW
BEGIN
  IF NEW.serial_number IS NOT NULL THEN
    SET NEW.serial_number = REPLACE(
                              REPLACE(
                                REPLACE(
                                  REPLACE(TRIM(NEW.serial_number), ' ', ''),
                                CHAR(9), ''),
                              CHAR(10), ''),
                            CHAR(13), '');
    IF NEW.serial_number = '' THEN
      SET NEW.serial_number = NULL;
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `service_order_products`
--

DROP TABLE IF EXISTS `service_order_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_order_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `is_replacement` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_order_product` (`order_id`,`product_id`,`is_replacement`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_service_order_products_order` FOREIGN KEY (`order_id`) REFERENCES `service_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_service_order_products_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_order_products`
--

LOCK TABLES `service_order_products` WRITE;
/*!40000 ALTER TABLE `service_order_products` DISABLE KEYS */;
INSERT INTO `service_order_products` VALUES (1,11,1,0,0,'2026-04-07 16:07:21'),(2,25,1,0,0,'2026-04-07 16:07:21'),(3,33,1,0,0,'2026-04-07 16:07:21'),(4,13,2,0,0,'2026-04-07 16:07:21'),(5,12,3,0,0,'2026-04-07 16:07:21'),(6,26,3,0,0,'2026-04-07 16:07:21'),(7,36,3,0,0,'2026-04-07 16:07:21'),(8,14,4,0,0,'2026-04-07 16:07:21'),(9,31,4,0,0,'2026-04-07 16:07:21'),(10,34,4,0,0,'2026-04-07 16:07:21'),(11,41,4,0,0,'2026-04-07 16:07:21'),(12,27,6,0,0,'2026-04-07 16:07:21'),(13,15,7,0,0,'2026-04-07 16:07:21'),(14,23,7,0,0,'2026-04-07 16:07:21'),(15,17,8,0,0,'2026-04-07 16:07:21'),(16,19,10,0,0,'2026-04-07 16:07:21'),(17,35,11,0,0,'2026-04-07 16:07:21'),(18,24,25,0,0,'2026-04-07 16:07:21'),(19,30,30,0,0,'2026-04-07 16:07:21'),(20,37,31,0,0,'2026-04-07 16:07:21'),(21,38,32,0,0,'2026-04-07 16:07:21'),(22,39,33,0,0,'2026-04-07 16:07:21'),(23,40,34,0,0,'2026-04-07 16:07:21'),(24,42,35,0,0,'2026-04-07 16:07:21'),(25,43,36,0,0,'2026-04-07 16:07:21'),(27,47,37,0,0,'2026-04-07 16:07:21'),(28,46,38,0,0,'2026-04-07 16:07:21'),(29,49,42,0,0,'2026-04-07 16:07:21'),(30,48,43,0,0,'2026-04-07 16:07:21'),(31,50,43,0,0,'2026-04-07 16:07:21'),(32,52,45,0,0,'2026-04-07 16:07:21'),(64,50,44,1,0,'2026-04-07 16:07:21'),(98,11,46,0,0,'2026-04-09 15:01:05'),(103,44,37,0,0,'2026-04-09 15:37:12'),(106,68,40,0,0,'2026-04-09 15:41:25'),(107,68,43,0,1,'2026-04-09 15:41:25'),(108,68,46,1,0,'2026-04-09 15:41:25'),(109,68,41,1,1,'2026-04-09 15:41:25'),(110,62,34,0,0,'2026-04-09 16:27:39'),(111,62,46,1,0,'2026-04-09 16:27:39'),(112,62,41,1,1,'2026-04-09 16:27:39'),(113,69,45,0,0,'2026-04-09 17:22:57'),(114,70,55,0,0,'2026-04-12 14:14:50'),(115,70,49,0,1,'2026-04-12 14:14:50'),(116,70,52,0,2,'2026-04-12 14:14:50'),(117,70,48,0,3,'2026-04-12 14:14:50'),(118,70,46,1,0,'2026-04-12 14:14:50'),(119,70,41,1,1,'2026-04-12 14:14:50'),(120,71,74,0,0,'2026-05-24 15:50:30');
/*!40000 ALTER TABLE `service_order_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_orders`
--

DROP TABLE IF EXISTS `service_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `service_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_code` varchar(20) NOT NULL,
  `client_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`product_ids`)),
  `replacement_product_id` int(11) DEFAULT NULL,
  `replacement_product_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`replacement_product_ids`)),
  `staff_id` int(11) DEFAULT NULL,
  `service_type` varchar(50) NOT NULL DEFAULT 'general',
  `issue_description` text DEFAULT NULL,
  `diagnosis_notes` text DEFAULT NULL,
  `repair_notes` text DEFAULT NULL,
  `warranty_status` enum('in_warranty','out_of_warranty','extended_warranty') DEFAULT 'out_of_warranty',
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `final_cost` decimal(10,2) DEFAULT NULL,
  `deposit_amount` decimal(10,2) DEFAULT 0.00,
  `payment_status` enum('pending','partially_paid','paid','refunded') NOT NULL DEFAULT 'pending',
  `estimated_delivery_date` date DEFAULT NULL,
  `actual_delivery_date` date DEFAULT NULL,
  `status` enum('pending','scheduled','process','ready','completed','delivered','cancelled') DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `rating` int(11) DEFAULT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `first_product_id` int(11) GENERATED ALWAYS AS (json_extract(`product_ids`,'$[0]')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_code` (`order_code`),
  KEY `product_id` (`product_id`),
  KEY `idx_service_orders_status` (`status`),
  KEY `idx_service_orders_client_id` (`client_id`),
  KEY `idx_service_orders_staff_id` (`staff_id`),
  KEY `idx_service_orders_priority` (`priority`),
  KEY `idx_service_orders_staff_status` (`staff_id`,`status`),
  KEY `fk_service_orders_replacement_product` (`replacement_product_id`),
  KEY `idx_service_orders_service_type` (`service_type`),
  CONSTRAINT `fk_service_orders_replacement_product` FOREIGN KEY (`replacement_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `service_orders_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `service_orders_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_orders`
--

LOCK TABLES `service_orders` WRITE;
/*!40000 ALTER TABLE `service_orders` DISABLE KEYS */;
INSERT INTO `service_orders` VALUES (11,'ORD001',1,46,'[1]',NULL,NULL,5,'general','Screen not turning on, possible display issue','Confirmed display cable damage, needs replacement','Replaced display cable, tested all functions','in_warranty',0.00,0.00,0.00,'paid','2024-02-15','2024-02-14','completed','high',5,'Customer satisfied with quick service','2025-12-28 12:05:24','2026-04-07 17:22:16',1),(12,'ORD002',2,3,'[3]',NULL,NULL,7,'general','Battery draining too fast','Battery health at 75%, requires replacement','Replaced battery, calibrated battery system','out_of_warranty',89.99,89.99,25.00,'paid','2024-02-18','2024-02-17','delivered','medium',4,'Customer noted slight improvement delay','2025-12-28 12:05:24','2026-04-07 16:58:32',3),(13,'ORD003',3,2,'[2]',NULL,NULL,5,'general','Keyboard keys not working properly','Multiple keys damaged, liquid spill suspected','Replaced entire keyboard assembly','in_warranty',0.00,0.00,0.00,'paid','2024-02-20','2024-02-21','delivered','medium',5,NULL,'2025-12-28 12:05:24','2026-04-07 16:58:32',2),(14,'ORD004',4,4,'[4]',NULL,NULL,8,'general','Camera not focusing properly','Camera module malfunction, autofocus issue','Replaced rear camera module','out_of_warranty',149.99,149.99,50.00,'paid','2024-02-22',NULL,'pending','high',NULL,'Waiting for customer approval on additional repairs','2025-12-28 12:05:24','2026-04-07 16:58:32',4),(15,'ORD005',5,7,'[7]',NULL,NULL,7,'general','PC overheating during gaming','Dust accumulation, thermal paste dried out','Cleaned all components, replaced thermal paste','in_warranty',0.00,0.00,0.00,'paid','2024-02-25','2024-02-24','scheduled','low',5,'Excellent cooling improvement noted','2025-12-28 12:05:24','2026-04-07 16:58:32',7),(17,'ORD007',7,8,'[8]',NULL,NULL,8,'general','No power, won\'t turn on','Power supply unit failed','Replaced PSU with 750W unit','out_of_warranty',129.99,129.99,129.99,'refunded','2024-03-01',NULL,'delivered','urgent',NULL,'Customer to pickup tomorrow','2025-12-28 12:05:24','2026-04-07 16:58:32',8),(19,'ORD009',9,10,'[10]',NULL,NULL,5,'general','Wireless connectivity issues','Bluetooth module faulty','Replaced Bluetooth module','in_warranty',0.00,0.00,0.00,'paid','2024-02-27','2024-02-26','delivered','low',4,'Customer happy with service','2025-12-28 12:05:24','2026-04-07 16:58:32',10),(23,'ORD20260106902',23,7,'[7]',NULL,NULL,7,'general','The Ram and Rom is issew',NULL,NULL,'in_warranty',5000.00,4500.00,0.00,'pending','2026-01-08',NULL,'pending','high',NULL,'best service','2026-01-06 14:49:36','2026-04-07 16:58:32',7),(24,'ORD20260108402',21,25,'[25]',NULL,NULL,5,'general','fffff ',NULL,NULL,'in_warranty',400.00,500.00,0.00,'paid','2026-01-09',NULL,'process','low',NULL,'fre fref ref','2026-01-08 17:13:55','2026-04-07 16:58:32',25),(25,'ORD20260108214',23,1,'[1]',NULL,NULL,5,'general','trcg5ytg',NULL,NULL,'in_warranty',100.00,500.00,0.00,'paid','2026-01-08',NULL,'process','medium',NULL,'5hyh y','2026-01-08 17:15:27','2026-04-07 16:58:32',1),(26,'ORD20260108470',5,3,'[3]',NULL,NULL,8,'general','jum uū',NULL,NULL,'extended_warranty',1000.00,800.00,0.00,'pending','2026-01-08',NULL,'delivered','high',NULL,' hb y','2026-01-08 17:21:31','2026-04-07 16:58:32',3),(27,'ORD20260108915',23,6,'[6]',NULL,NULL,5,'general','43ftttgg',NULL,NULL,'extended_warranty',800.00,800.00,0.00,'pending','2026-01-08',NULL,'delivered','low',NULL,'ggttgvg','2026-01-08 17:24:04','2026-04-07 16:58:32',6),(30,'ORD2026011151E14B',40,30,'[30]',NULL,NULL,20,'general','dispalay',NULL,NULL,'in_warranty',1100.00,1000.00,499.99,'paid','2026-01-11',NULL,'delivered','medium',NULL,'best  service','2026-01-11 12:46:29','2026-04-07 16:58:32',30),(31,'ORD20260111130',21,4,'[4]',NULL,NULL,21,'general','noinasdooasdnsnoai',NULL,NULL,'in_warranty',1000.00,800.00,200.00,'partially_paid','2026-01-15',NULL,'scheduled','high',NULL,'jklnoafnlolnasfnoslalna','2026-01-11 16:53:53','2026-04-07 16:58:32',4),(33,'ORD202601116B6EC3',24,1,'[1]',NULL,NULL,24,'general','dsdgsg',NULL,NULL,'extended_warranty',4500.00,4000.00,2000.00,'paid','2026-01-17',NULL,'pending','high',NULL,'sddgd','2026-01-11 17:19:02','2026-04-07 16:58:32',1),(34,'ORD20260111D8C81B',23,4,'[4]',NULL,NULL,19,'general','dsgsdsdsd',NULL,NULL,'in_warranty',6000.00,6000.00,2500.00,'paid','2026-01-15',NULL,'scheduled','low',NULL,'sdfsdhhsdsdh','2026-01-11 17:25:17','2026-04-07 16:58:32',4),(35,'ORD20260111060A46',41,11,'[11]',NULL,NULL,21,'general','Display\n',NULL,NULL,'in_warranty',3500.00,3000.00,1500.00,'partially_paid','2026-01-12',NULL,'scheduled','medium',NULL,'nibnbfsdamdsaf','2026-01-11 17:33:04','2026-04-07 16:58:32',11),(36,'ORD20260111F22E14',21,3,'[3]',NULL,NULL,19,'general','gffsdgsdf',NULL,NULL,'out_of_warranty',8000.00,4999.98,1999.99,'paid','2026-01-12',NULL,'pending','medium',NULL,'dsdsdg','2026-01-11 17:42:39','2026-04-07 16:58:32',3),(37,'ORD20260111477814',21,31,'[31]',NULL,NULL,23,'general','gngf',NULL,NULL,'out_of_warranty',6000.00,6000.00,2000.00,'paid','2026-01-11',NULL,'pending','medium',NULL,'dfhhdfhdf','2026-01-11 17:46:28','2026-04-07 16:58:32',31),(38,'ORD2026011160DCC9',42,32,'[32]',NULL,NULL,25,'general','asgaggsdasdasd',NULL,NULL,'in_warranty',5000.00,6000.00,3000.00,'partially_paid','2026-01-11',NULL,'scheduled','medium',NULL,'sfaasfgsagfsga','2026-01-11 19:37:58','2026-04-07 16:58:32',32),(39,'ORD20260111B53729',43,33,'[33]',NULL,NULL,23,'general','sfasafsafas',NULL,NULL,'out_of_warranty',1000.00,1200.00,499.99,'pending','2026-01-11',NULL,'pending','medium',NULL,'asffsafassaf','2026-01-11 19:51:39','2026-04-07 16:58:32',33),(40,'ORD20260112D26CE9',44,34,'[34]',NULL,NULL,15,'general','egegqegewg',NULL,NULL,'out_of_warranty',1000.00,799.99,300.00,'partially_paid','2026-01-12',NULL,'pending','medium',NULL,'ewqfqewfqewf','2026-01-12 15:22:05','2026-04-07 16:58:32',34),(41,'ORD2026011538086D',8,4,'[4]',NULL,NULL,21,'general','sddsgdsggds',NULL,NULL,'extended_warranty',5000.00,40000.00,2000.00,'partially_paid','2026-01-15',NULL,'pending','medium',NULL,'sdgdsgsdggdd','2026-01-15 14:41:07','2026-04-07 16:58:32',4),(42,'ORD20260115AF3D54',22,35,'[35]',NULL,NULL,20,'general','eweee',NULL,NULL,'out_of_warranty',8000.00,5000.00,3000.00,'partially_paid','2026-01-15',NULL,'scheduled','medium',NULL,'eeew','2026-01-15 17:29:30','2026-04-07 16:58:32',35),(43,'ORD20260115DA2F60',45,36,'[36]',NULL,NULL,20,'general','Monitor issue, keyboard is not working, Change nee 16GB ram, setup new 1TB hard disk with windows OS',NULL,NULL,'in_warranty',6000.00,5000.00,1500.00,'partially_paid','2026-01-30',NULL,'scheduled','high',NULL,'Add free anti-virus and MS office 360','2026-01-15 19:18:21','2026-04-07 16:58:32',36),(44,'ORD202601163077DD',41,37,'[37]',NULL,NULL,4,'general','Ufji',NULL,NULL,'out_of_warranty',500.00,500.00,200.00,'partially_paid','2026-04-09',NULL,'completed','medium',NULL,'Ghgj','2026-01-16 06:19:31','2026-04-09 15:37:12',37),(46,'ORD20260325B57EC9',40,38,'[38]',NULL,NULL,21,'general','4jkbyubvyh',NULL,NULL,'out_of_warranty',5521.00,5521.00,0.00,'pending','2026-04-06',NULL,'delivered','medium',NULL,'','2026-03-25 17:05:31','2026-04-07 16:58:32',38),(47,'ORD2026040307885F',41,37,'[37]',NULL,NULL,NULL,'general','',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','0000-00-00',NULL,'completed','medium',NULL,'','2026-04-03 17:50:40','2026-04-07 16:58:32',37),(48,'ORD20260403D0CD24',42,43,'[43]',NULL,NULL,NULL,'general','',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','2026-04-03',NULL,'delivered','medium',NULL,'','2026-04-03 19:02:05','2026-04-07 16:58:32',43),(49,'ORD2026040313D607',43,42,'[42]',NULL,NULL,NULL,'general','',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','2026-04-03',NULL,'delivered','medium',NULL,'','2026-04-03 19:10:25','2026-04-07 16:58:32',42),(50,'ORD20260403EBA1E5',42,43,'[43]',44,'[44]',NULL,'general','',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','0000-00-00',NULL,'delivered','medium',NULL,'','2026-04-03 19:12:30','2026-04-07 16:58:32',43),(52,'ORD20260407F5775E',46,45,'[45]',NULL,NULL,15,'general','',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','0000-00-00',NULL,'delivered','medium',NULL,'','2026-04-07 12:32:15','2026-04-07 16:58:32',45),(62,'ORD999',1,34,'[1, 2, 3]',46,NULL,5,'general','Multiple products need service',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','0000-00-00',NULL,'scheduled','medium',NULL,'','2026-04-07 17:17:21','2026-04-09 16:27:39',1),(68,'ORD20260407DD6003',41,40,NULL,46,NULL,NULL,'general','8088',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','0000-00-00',NULL,'scheduled','medium',NULL,'','2026-04-07 19:13:49','2026-04-09 15:41:25',NULL),(69,'ORD2026040910B90D',45,45,NULL,NULL,NULL,NULL,'general','sdgsgsdg',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','0000-00-00',NULL,'pending','medium',NULL,'','2026-04-09 17:22:57','2026-04-09 17:22:57',NULL),(70,'ORD20260412A08027',46,55,NULL,46,NULL,NULL,'general','ewegwgw',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','0000-00-00',NULL,'pending','medium',NULL,'','2026-04-12 14:14:50','2026-04-12 14:14:50',NULL),(71,'ORD20260524698C27',33,74,NULL,NULL,NULL,21,'general','rhef',NULL,NULL,'out_of_warranty',0.00,0.00,0.00,'pending','2026-05-24',NULL,'pending','medium',NULL,'','2026-05-24 15:50:30','2026-05-24 15:50:30',NULL);
/*!40000 ALTER TABLE `service_orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=``*/ /*!50003 TRIGGER after_service_order_delivered

AFTER UPDATE ON service_orders

FOR EACH ROW

BEGIN

    -- Check if status changed to 'delivered'

    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN

        

        -- Insert into deliveries table

        INSERT INTO deliveries (

            order_id,

            delivery_code,

            delivery_type,

            address,

            contact_person,

            contact_phone,

            scheduled_date,

            scheduled_time,

            delivered_date,

            delivery_person,

            status,

            notes,

            created_at,

            updated_at

        )

        SELECT 

            NEW.id,

            CONCAT('DEL', LPAD(NEW.id, 6, '0')),  -- Generates DEL000011, DEL000012, etc.

            COALESCE(NULL, 'pickup'),  -- Default to 'pickup'

            c.address,

            c.full_name,

            c.phone,

            NEW.actual_delivery_date,  -- Use the actual_delivery_date from service order

            '09:00:00',  -- Default scheduled time

            NOW(),  -- Delivered date is current timestamp

            'System Auto-assigned',  -- Default delivery person

            'delivered',  -- Status is delivered

            CONCAT('Auto-created delivery record for order ', NEW.order_code, ' - Product delivered'),

            NOW(),

            NOW()

        FROM clients c

        WHERE c.id = NEW.client_id;

        

    END IF;

END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `staff_expenses`
--

DROP TABLE IF EXISTS `staff_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `service_type` varchar(50) NOT NULL DEFAULT 'general',
  `expense_type` varchar(50) NOT NULL DEFAULT 'others',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `description` varchar(255) NOT NULL,
  `expense_date` date NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `receipt_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_staff_expenses_staff_date` (`staff_id`,`expense_date`),
  KEY `idx_staff_expenses_service_date` (`service_type`,`expense_date`),
  KEY `idx_staff_expenses_type_date` (`expense_type`,`expense_date`),
  KEY `fk_staff_expenses_created_by` (`created_by`),
  CONSTRAINT `fk_staff_expenses_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_expenses_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_expenses`
--

LOCK TABLES `staff_expenses` WRITE;
/*!40000 ALTER TABLE `staff_expenses` DISABLE KEYS */;
INSERT INTO `staff_expenses` VALUES (1,26,'esther','general','petrol',100.00,'manur to tvl','2026-04-05','cash',NULL,NULL,1,'Admin User','2026-04-05 18:37:26','2026-04-05 18:37:26');
/*!40000 ALTER TABLE `staff_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_salaries`
--

DROP TABLE IF EXISTS `staff_salaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_salaries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `service_type` varchar(50) NOT NULL DEFAULT 'general',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `bonus` decimal(12,2) NOT NULL DEFAULT 0.00,
  `deductions` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `salary_date` date NOT NULL,
  `salary_month` char(7) NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'bank_transfer',
  `transaction_id` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `paid_by` int(11) DEFAULT NULL,
  `paid_by_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_staff_salaries_staff_date` (`staff_id`,`salary_date`),
  KEY `idx_staff_salaries_service_date` (`service_type`,`salary_date`),
  KEY `idx_staff_salaries_salary_month` (`salary_month`),
  KEY `fk_staff_salaries_paid_by` (`paid_by`),
  CONSTRAINT `fk_staff_salaries_paid_by` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_staff_salaries_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_salaries`
--

LOCK TABLES `staff_salaries` WRITE;
/*!40000 ALTER TABLE `staff_salaries` DISABLE KEYS */;
INSERT INTO `staff_salaries` VALUES (1,26,'esther','general',1000.00,0.00,0.00,1000.00,'2026-04-05','2026-04','cash',NULL,NULL,1,'Admin User','2026-04-05 18:36:09','2026-04-05 18:36:09');
/*!40000 ALTER TABLE `staff_salaries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `department` varchar(100) DEFAULT 'general',
  `avatar` varchar(500) DEFAULT NULL,
  `profile_image` varchar(500) DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@sun.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Admin User','8220647708','admin','',NULL,NULL,'2026-05-24 17:53:46',1,'2025-12-27 18:25:26','2026-05-24 17:53:46'),(2,'user@sun.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Demo User','123456789','user','',NULL,NULL,'2026-02-27 18:50:34',1,'2025-12-27 18:25:26','2026-02-27 18:50:34'),(4,'staff@suncomputers.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Service Staff','123456789','user','','',NULL,'2026-04-07 12:21:31',1,'2025-12-28 12:00:59','2026-04-07 12:21:31'),(5,'john@suncomputers.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','John Smith','123456789','user','','',NULL,'2026-04-05 18:44:08',1,'2025-12-28 12:00:59','2026-04-06 18:15:40'),(6,'sarah@suncomputers.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Sarah Johnson','123456789','user','','',NULL,NULL,1,'2025-12-28 12:00:59','2026-04-06 18:15:44'),(7,'mike@suncomputers.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Mike Brown','123456789','user','','',NULL,NULL,1,'2025-12-28 12:00:59','2026-04-06 18:15:53'),(8,'lisa@suncomputers.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Lisa Davis','123456789','user','','',NULL,NULL,1,'2025-12-28 12:00:59','2026-04-06 18:15:47'),(15,'john@example.com','$2y$10$U0liidEsqTDS3yUtamO0pubfdz2ZOS7fWI0/PXcVVti9IFUXfS7ri','John Doe','1234567890','user','general',NULL,NULL,'2026-01-08 16:19:06',1,'2026-01-07 17:14:19','2026-01-09 18:45:47'),(19,'jeni@gmail.com','$2y$10$AY6av2qCt0epDXl..HJ8/O/J4TL8CFL9/k7W0h2fD0cRaDlcVytvm','aro jeni','7788994455','admin','general',NULL,'jeni.jpg','2026-01-10 08:45:32',1,'2026-01-10 05:33:59','2026-01-10 08:45:32'),(20,'jeni12@gmail.com','$2y$10$VWlN7PoSW2LEFGm./vzqUO98DLzhv80AwCAtNs5uSklvF92X08Ere','Jeni','7788994455','user','sales',NULL,NULL,'2026-01-11 11:07:25',1,'2026-01-10 05:53:12','2026-01-11 11:07:25'),(21,'chellam@gmail.com','$2y$10$7no4T9HyGWNk0Wcah3KDHeS.kxDyo37FlSE1f31UxWI6yVAo40Giu','Chellam','7744112255','user','general',NULL,NULL,NULL,1,'2026-01-10 16:13:25','2026-01-10 16:13:25'),(23,'afsaf@gmail.com','$2y$10$JCRGl2ekF2rHaWPPwwY35eEtjc7IkYKeBF8nSuCZzL9MV7CA565gq','jjeed','1234567895','user','general',NULL,NULL,NULL,1,'2026-01-10 17:21:26','2026-01-10 17:21:26'),(24,'sun@gmail.com','$2y$10$YzPeCpBrE9b70/D6YgZmVOrMnE.dsxEzYFzEOTL2aaQRFsUtFXSG2','sun admin','1144778855','admin','general',NULL,NULL,NULL,1,'2026-01-11 10:15:38','2026-01-11 10:15:38'),(25,'appikutty@gmail.com','$2y$10$/BQhvooJPkUhoXuzbbUi5OkFMQN1rL1zXNG3higMG0iYdKsOESt52','appi kutty','08220647708','user','general',NULL,NULL,'2026-01-11 11:01:48',1,'2026-01-11 10:25:46','2026-01-11 11:01:48'),(26,'esther@gmail.com','$2y$10$D0Sez0yzj.d8O9YNC1x.X.VCQuA/nH2GBDlkTTMqkK6v471Hk1492','esther','08220647708','user','general',NULL,NULL,NULL,1,'2026-04-05 16:48:23','2026-04-05 16:48:23');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'sun_computers'
--

--
-- Dumping routines for database 'sun_computers'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-27 20:22:48
