import { useEffect, useState, useRef } from 'react';

import { supabase } from './supabaseClient';
import moment from 'moment';

import Handsontable from 'handsontable';
import { HotTable, HotColumn } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import { registerLanguageDictionary, ruRU } from 'handsontable/i18n';
import 'handsontable/dist/handsontable.full.css';

import { platform_options, department_options, employee_options, format_options } from '../utils/constants';

import './App.css';

registerAllModules();
registerLanguageDictionary(ruRU);

export const ExampleComponent = () => {
	const hotRef = useRef(null);
	const [projects, setProjects] = useState([]);
	let saveClickCallback;
	let exportClickCallback;

	async function upsertProjects(objects) {
		try {
			const { data, error } = await supabase.from('projects').upsert(objects);
			if (error) throw error;
		} catch (e) {
			throw e;
		}
	}

	async function deleteProjects(objects) {
		try {
			const { error } = await supabase.from('projects').delete().in('id', objects);
			if (error) throw error;
		} catch (e) {
			throw e;
		}
	}

	useEffect(() => {
		async function getProjects() {
			const { data, error } = await supabase
				.from('projects')
				.select(
					'id,project_id,itime_id,wave,platform,path,department,manager,programming_programmer,programming_deadline,programming_materials,processing_processor,processing_deadline,processing_materials,datafile_processor,datafile_format,datafile_deadline,datafile_materials,programming_comments,processing_comments,audit'
				);
			if (error) console.error('Ошибка при загрузке данных: ', error);
			setProjects(data);
		}

		getProjects();
	}, []);

	useEffect(() => {
		// Get the hot instance from the hotRef
		const hot = hotRef.current.hotInstance;

		// Check if the hot instance exists
		if (hot) {
			// Add a 'beforeUpdateData' hook
			hot.addHook('beforeUpdateData', function (data) {
				// Get the properties that end with 'deadline' or 'materials'
				const properties = Object.keys(data[0]).filter(
					(property) => property.endsWith('deadline') | property.endsWith('materials')
				);

				// Loop through each property
				properties.forEach((property) => {
					// Find the first non-null value for the property
					const firstNonNullValue = data.find((row) => row[property] !== null)[property];

					// Check if the first non-null value is a valid date
					if (moment(firstNonNullValue, 'YYYY-MM-DD', true).isValid()) {
						// Loop through each row in the data
						data.forEach((row) => {
							const value = row[property];
							// Check if the value is not null and is a valid date
							if (value !== null && moment(value, 'YYYY-MM-DD', true).isValid()) {
								// Format the date and assign it back to the row
								row[property] = moment(value, 'YYYY-MM-DD').format('DD.MM.YYYY');
							}
						});
					}
				});

				// Return the updated data
				return data;
			});

			// hot.updateData(projects);

			// Add an 'afterUpdateData' hook
			hot.addHook('afterUpdateData', () => {
				// Get the columnSorting plugin
				const columnSorting = hot.getPlugin('columnSorting');
				// Sort the data by the first column in descending order
				columnSorting.sort({
					column: 0,
					sortOrder: 'desc',
				});
			});
		}
	}, [projects]); // The dependency array includes 'projects'

	useEffect(() => {
		const hot = hotRef.current.hotInstance;
		const exportPlugin = hot.getPlugin('exportFile');

		exportClickCallback = () => {
			exportPlugin.downloadFile('csv', {
				bom: false,
				columnDelimiter: ',',
				columnHeaders: false,
				exportHiddenColumns: true,
				exportHiddenRows: true,
				fileExtension: 'csv',
				filename: 'DP_Tracker_[DD].[MM].[YYYY]',
				mimeType: 'text/csv',
				rowDelimiter: '\r\n',
				rowHeaders: true,
			});
		};

		saveClickCallback = () => {
			const projects = hot.getSourceData();
			var maxId = projects.reduce((max, obj) => {
				return obj.id !== null && obj.id > max ? obj.id : max;
			}, 0);

			const usedIds = new Set();

			projects.forEach((obj, index) => {
				if (obj.id === null) {
					let newId = maxId + 1;

					while (usedIds.has(newId)) {
						newId++;
					}

					obj.id = newId;
					maxId = newId;
					usedIds.add(newId);
				}
			});

			const convertedProjects = projects.map((project) => {
				const dateProperties = Object.getOwnPropertyNames(project).filter(
					(property) => property.endsWith('deadline') | property.endsWith('materials')
				);
				for (const property of dateProperties) {
					if (!moment(project[property], ['DD.MM.YYYY', 'YYYY-MM-DD']).isValid()) {
						project[property] = null;
					}

					if (moment(project[property], 'DD.MM.YYYY', true).isValid()) {
						const newDate = project[property];
						project[property] = moment(newDate, 'DD.MM.YYYY').format('YYYY-MM-DD');
					}
				}
				return project;
			});
			// console.log(convertedProjects);
			upsertProjects(convertedProjects);
		};
	});

	return (
		<div>
			<div>
				<button
					id="save"
					className="button"
					onClick={(...args) => saveClickCallback(...args)}>
					Сохранить
				</button>
				<button
					id="export-csv"
					onClick={(...args) => exportClickCallback(...args)}>
					CSV
				</button>
			</div>
			<HotTable
				data={projects}
				ref={hotRef}
				rowHeaders={true}
				colWidths={[
					'1',
					'120',
					'40',
					'100',
					'140',
					'100',
					'100',
					'100',
					'175',
					'100',
					'100',
					'175',
					'100',
					'100',
					'175',
					'100',
					'100',
					'100',
					'150',
					'150',
					'100',
				]}
				colHeaders={[
					'UID',
					'Номер',
					'iTime',
					'волна/<br/>часть',
					'Платформа/<br/>метод',
					'Путь',
					'Отдел',
					'Менеджер',
					'Программист',
					'Сроки',
					'Дата<br/>получения<br/>материалов',
					'Обработчик',
					'Сроки',
					'Дата<br/>получения<br/>материалов',
					'Обработчик файла<br/>данных',
					'Формат',
					'Сроки',
					'Дата<br/>получения<br/>материалов',
					'Комментарии<br/>к программингу',
					'Комментарии<br/>к обработке',
					'Аудит',
				]}
				columnSorting={true}
				contextMenu={true}
				filters={true}
				dropdownMenu={true}
				height="100%"
				width="100%"
				className="custom-table"
				rowHeights={40}
				language={ruRU.languageCode}
				licenseKey="non-commercial-and-evaluation"
				beforeRemoveRow={function (index, amount, physicalRows) {
					const deletedIds = [];
					for (const row of physicalRows) {
						deletedIds.push(projects[row].id);
					}
					deleteProjects(deletedIds);
				}}
				afterChange={function (change, source) {
					if (source === 'loadData') {
						// The table data has been loaded.
						return;
					}
				}}>
				<HotColumn
					data="id"
					type="numeric"
					wordWrap={false}
				/>
				<HotColumn
					data="project_id"
					wordWrap={false}
				/>
				<HotColumn
					data="itime_id"
					wordWrap={false}
				/>
				<HotColumn
					data="wave"
					wordWrap={false}
				/>
				<HotColumn
					data="platform"
					type="dropdown"
					source={platform_options}
				/>
				<HotColumn
					data="path"
					wordWrap={false}
				/>
				<HotColumn
					data="department"
					type="dropdown"
					source={department_options}
				/>
				<HotColumn
					data="manager"
					wordWrap={false}
				/>
				<HotColumn
					data="programming_programmer"
					type="dropdown"
					source={employee_options}
				/>
				<HotColumn
					data="programming_deadline"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}></HotColumn>
				<HotColumn
					data="programming_materials"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}></HotColumn>
				<HotColumn
					data="processing_processor"
					type="dropdown"
					source={employee_options}
				/>
				<HotColumn
					data="processing_deadline"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}></HotColumn>
				<HotColumn
					data="processing_materials"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}></HotColumn>
				<HotColumn
					data="datafile_processor"
					type="dropdown"
					source={employee_options}
				/>
				<HotColumn
					data="datafile_format"
					type="dropdown"
					source={format_options}
				/>
				<HotColumn
					data="datafile_deadline"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}></HotColumn>
				<HotColumn
					data="datafile_materials"
					type="date"
					dateFormat="DD.MM.YYYY"
					correctFormat={true}></HotColumn>
				<HotColumn
					data="programming_comments"
					wordWrap={false}
				/>
				<HotColumn
					data="processing_comments"
					wordWrap={false}
				/>
				<HotColumn
					data="audit"
					wordWrap={false}
				/>
			</HotTable>
		</div>
	);
};
