import React from 'react';
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import {Button, Form, Input} from "antd";
import {useTranslation} from "react-i18next";

export interface StringListInputProps {
    name: React.ComponentProps<typeof Form.List>['name'];
    label: React.ReactNode;
    extra?: React.ReactNode;
    placeholder?: string;
}

const StringListInput: React.FC<StringListInputProps> = ({name, label, extra, placeholder}) => {
    const {t} = useTranslation();

    return (
        <Form.Item label={label} extra={extra ? <div className="mt-1">{extra}</div> : undefined}>
            <Form.List name={name}>
                {(fields, {add, remove}) => (
                    <div className="flex flex-col gap-2">
                        {fields.map(({key, name: fieldName, ...restField}) => (
                            <div key={key} className="grid grid-cols-[minmax(0,1fr)_32px] items-start gap-2">
                                <Form.Item
                                    {...restField}
                                    name={fieldName}
                                    rules={[{required: true, whitespace: true}]}
                                    style={{marginBottom: 0}}
                                >
                                    <Input placeholder={placeholder}/>
                                </Form.Item>
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined/>}
                                    aria-label={t('actions.delete')}
                                    onClick={() => remove(fieldName)}
                                />
                            </div>
                        ))}
                        <Button
                            type="dashed"
                            icon={<PlusOutlined/>}
                            onClick={() => add('')}
                            block
                        >
                            {t('actions.add')}
                        </Button>
                    </div>
                )}
            </Form.List>
        </Form.Item>
    );
};

export default StringListInput;
